import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {DateFunctionServiceProvider} from "../../providers/date-function-service/date-function-service";
import {DataReport} from "../../interfaces/customTypes";

@Component({
  selector: 'page-data-summary',
  templateUrl: 'data-summary.html',
})
export class DataSummaryPage {
  private fromDate : string;
  private toDate : string;
  private today : any;
  private allTrackedData : any;
  private currentlyTracking : any;
  private dataTypeColor = {"Change" : "#8052AF",
    "Symptom" : "#32A1C3",
    "Treatment" : "#E09845",
    "Contributor" : "#30916C",
    "Other" : "#D09595"
  };

  private filteredDataByID : {[dataID: string] : {[reportProps: string] : any}[]};
  private filteredDataFieldByID: any = {};
  private dataTypes : string[];
  private expanded: {[dataType:string] : boolean} = {};

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              public couchDBService: CouchDbServiceProvider,
              public dateFunctions: DateFunctionServiceProvider) {
  }

  ionViewDidLoad() {
    this.initDates();
    this.setDataTypes();
  }

  /**
   * Initialize dates
   */
  initDates(){
    let today = new Date();
    this.today = today.toISOString();
    this.toDate = new Date().toISOString();
    this.fromDate = this.dateFunctions.getMonthAgo(today).toISOString();
    // this.fromDate = new Date('2018-07-06').toISOString();
  }

  /**
   * Organize data by data types
   */
  async setDataTypes() {
    this.allTrackedData = await this.couchDBService.fetchTrackedDataRange(this.fromDate, this.toDate);
    console.log(this.allTrackedData);
    this.currentlyTracking = await this.couchDBService.fetchConfiguredRoutine();
    this.currentlyTracking = this.currentlyTracking['dataToTrack'];
    let allDataTypes = Object.keys(this.currentlyTracking);

    for (let i=0; i<allDataTypes.length; i++) { // we won't report notes, so if it's all they have for a datatype, remove
      this.currentlyTracking[allDataTypes[i]] = this.currentlyTracking[allDataTypes[i]].filter(function(dataItem){
        return dataItem.field !== 'note';
      });
      if (this.currentlyTracking[allDataTypes[i]].length === 0) {
        delete this.currentlyTracking[allDataTypes[i]];
      } else {
        this.expanded[allDataTypes[i]] = true;
      }
    }
    this.dataTypes = Object.keys(this.currentlyTracking);
    this.aggregateData(this.allTrackedData);
  }

  /**
   * Aggregate data by data types and in time sequences
   * @param filteredData
   */
  aggregateData(filteredData : DataReport[]) {
    let trackedDict = {};
    for (let i = 0; i < this.dataTypes.length; i++) {
      let trackingOfType = this.currentlyTracking[this.dataTypes[i]] ? this.currentlyTracking[this.dataTypes[i]] : [];
      for (let t = 0; t < trackingOfType.length; t++) {
        if (!trackedDict[trackingOfType[t]['id']])
          trackedDict[trackingOfType[t].id] = {
            'name': trackingOfType[t]['name'],
            'field': trackingOfType[t]['field'],
            'vals': {'binary': [], 'number': [], 'numeric scale': [],
              'category scale': [], 'time': [], 'duration': [], 'calculated medication use': []},
            'goal': trackingOfType[t]['goal']
          };
      }
    }
    for (let i=0; i<filteredData.length; i++) {
      let trackedDataTypes = Object.keys(filteredData[i][0]);
      for (let j=0; j<trackedDataTypes.length; j++) {
          let dataItems = filteredData[i][0][trackedDataTypes[j]];
          let dataFields = filteredData[i][1][trackedDataTypes[j]];
          for (let dataID in dataItems) { // aggregate all of the values for each datatype into a single list
            let dataItem = dataItems[dataID];
            let dataType = dataFields[dataID];

            if (trackedDict[dataID]) {
              if (dataType === 'time range') {
                trackedDict[dataID]['vals']['duration'].push(this.getDuration(dataItem))
              } else {
                trackedDict[dataID]['vals'][dataType].push(dataItem);
              }
            } else {
              // console.log("Not currently tracking " + dataID);
            }
          }
      }
    }
    this.getDataToReport(trackedDict);
  }

  /**
   * Calculate data to report
   * @param trackedDict
   */
  getDataToReport(trackedDict : {[dataID: string] : {[reportProps: string] : any}[]}){
    let dataIDs = Object.keys(trackedDict);
    let allAggregatedDataByTypes = {};

    for (let i=0; i<dataIDs.length; i++) {
      let serialDataByTypes = trackedDict[dataIDs[i]]['vals'];
      let aggregatedDataByTypes = {};
      for (let j = 0; j < Object.keys(serialDataByTypes).length; j++) {
        let type = Object.keys(serialDataByTypes)[j];

        if (serialDataByTypes[type].length > 0) {
          aggregatedDataByTypes[type] = {};
          aggregatedDataByTypes[type]["totalDayReported"] = serialDataByTypes[type].length;
          if (type === "binary") {
            aggregatedDataByTypes[type]["totalValReported"] = serialDataByTypes[type].length;
            aggregatedDataByTypes[type]["yes"] = serialDataByTypes[type].filter(function (data) {
              return data === 'Yes'
            }).length;
          } else if (type === "number") {
            aggregatedDataByTypes[type]["totalValReported"] = this.getSum(serialDataByTypes[type]);
            aggregatedDataByTypes[type]["averageValReported"] = (aggregatedDataByTypes[type]["totalValReported"]
                / serialDataByTypes[type].length).toFixed(2);
          } else if (type === 'numeric scale') {
            aggregatedDataByTypes[type]["totalValReported"] = this.getSum(serialDataByTypes[type]);
            aggregatedDataByTypes[type]["averageValReported"] = (aggregatedDataByTypes[type]["totalValReported"]
                / serialDataByTypes[type].length).toFixed(2);
          } else if(type === 'category scale') {
            aggregatedDataByTypes[type]["catCountsReported"] = {"Some": 0, "None": 0, "Lots": 0};
            for (let j=0; j<serialDataByTypes[type].length; j++) {
              aggregatedDataByTypes[type]["catCountsReported"][serialDataByTypes[type][j]]++;
            }
          } else if (trackedDict[dataIDs[i]]['field'] === 'time range') {
            let addedDurations = this.getSum(serialDataByTypes[type]);
            aggregatedDataByTypes[type]["averageValReported"] = (addedDurations
                / serialDataByTypes[type].length).toFixed(2);
            aggregatedDataByTypes[type]["averageTimeReported"] =
                this.dateFunctions.milisecondsToTime(aggregatedDataByTypes[type]["averageValReported"]);
          } else if (trackedDict[dataIDs[i]]['field'] === 'time') {
            aggregatedDataByTypes[type]["timePartitionCountsReported"] = {"Morning": 0, "Afternoon": 0, "Evening": 0, "Night": 0};
            for (let j=0; j<serialDataByTypes[type].length; j++) {
              let timePartition = this.dateFunctions.getTimePartition(serialDataByTypes[type][j]);
              if (timePartition[0]) {
                aggregatedDataByTypes[type]["timePartitionCountsReported"]['Night']++;
              } else if (timePartition[1]) {
                aggregatedDataByTypes[type]["timePartitionCountsReported"]['Morning']++;
              } else if (timePartition[2]) {
                aggregatedDataByTypes[type]["timePartitionCountsReported"]['Afternoon']++;
              } else if (timePartition[3]) {
                aggregatedDataByTypes[type]["timePartitionCountsReported"]['Evening']++;
              }
            }
          }
          // else {
            // console.log("#########");
            // console.log(type);
          // }
        }
      }
      allAggregatedDataByTypes[dataIDs[i]] = aggregatedDataByTypes;
    }
    for(let i=0; i<dataIDs.length; i++) {
      this.filteredDataFieldByID[dataIDs[i]] = Object.keys(allAggregatedDataByTypes[dataIDs[i]]);
    }
    this.filteredDataByID = allAggregatedDataByTypes;
  }

  /**
   * Sum an array of data values
   * @param dataVals
   */
  getSum(dataVals) : number {
    if (dataVals.length === 0) return null;
    return dataVals.reduce(function(a, b) {
      return Number(a) + Number(b);
    });
  }

  /**
   * Get time duration given a start and an end date
   * @param timeRangeDict
   */
  getDuration(timeRangeDict : {[timeEnds: string] : string}) : number{
    let earlyTime = timeRangeDict['start'];
    let lateTime = timeRangeDict['end'];
    if(earlyTime === undefined || lateTime === undefined){
      return 0;
    } else{
      return this.dateFunctions.getDuration(earlyTime, lateTime);
    }
  }
}
