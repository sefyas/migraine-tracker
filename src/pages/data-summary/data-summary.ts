import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {DateFunctionServiceProvider} from "../../providers/date-function-service/date-function-service";
import {DataElement, DataReport} from "../../interfaces/customTypes";



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
  private dataTypes : string[];
  private expanded: {[dataType:string] : boolean} = {};

  constructor(public navCtrl: NavController, public navParams: NavParams,
              public couchDBService: CouchDbServiceProvider, public dateFunctions: DateFunctionServiceProvider) {

  }

  ionViewDidLoad() {
    this.initDates();
    this.setDataTypes();
  }

  initDates(){
    let today = new Date();
    this.today = today.toISOString();
    this.toDate = new Date().toISOString();
    this.fromDate = this.dateFunctions.getMonthAgo(today).toISOString();

    this.fromDate = new Date('2018-07-06').toISOString();
  }

  async setDataTypes(){
    this.allTrackedData = await this.couchDBService.fetchTrackedDataRange(this.fromDate, this.toDate);
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
    this.filterData();
  }

  filterData(filterDate : string = undefined, filterDir : string=undefined){
    let append = false; // if we only EXPAND the filter we want to ADD values; otherwise, just start over
    // (with bigger data it would be better to always adjust instead of redoing, but here I think it's ok)

    let filterStart = this.fromDate;
    let filterEnd = this.toDate;

    if (filterDir === 'early') { // because of dumb ionic bug it doesn't bind
      if (this.dateFunctions.dateGreaterOrEqual(this.fromDate, filterDate)) {
        append = true;
        filterEnd = this.fromDate;
      }
      this.fromDate = filterDate;
      filterStart = filterDate;
    } else if (filterDir === 'late') {
      if (this.dateFunctions.dateGreaterOrEqual(filterDate, this.toDate)) {
        append = true;
        filterStart = this.toDate;
      }
      this.toDate = filterDate;
      filterEnd = filterDate;
    }
    let actualThis = this;
    let filteredData = this.allTrackedData.filter(function (datapoint) {
      return actualThis.dateFunctions.dateGreaterOrEqual(datapoint.startTime, filterStart) &&
        actualThis.dateFunctions.dateGreaterOrEqual(filterEnd, datapoint.startTime);
    });

    // console.log("~~~~~~ filteredData");
    // console.log(filteredData);
    //
    // console.log("~~~~~~ append");
    // console.log(append);

    this.aggregateData(filteredData, append);
  }

  aggregateData(filteredData : DataReport[], append: boolean) {
    let trackedDict;
    if (!append) { //initializes the dicts for each datapoint
      trackedDict = {};
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
    } else{
      trackedDict = this.filteredDataByID;
    }

    for (let i=0; i<filteredData.length; i++) {
      let trackedDataTypes = Object.keys(filteredData[i]);
      for (let j=0; j<trackedDataTypes.length; j++) {
        if (this.dataTypes.indexOf(trackedDataTypes[j]) > -1) { // if we're not still tracking we assume we don't care
          let dataItems = filteredData[i][trackedDataTypes[j]];
          for (let dataID in dataItems) { // aggregate all of the values for each datatype into a single list
            if (trackedDict[dataID]) {
              if (trackedDict[dataID]['field'] === 'time range') {
                // console.log("field", trackedDict[dataID]['field']);
                // console.log("vals", trackedDict[dataID]['vals']);
                trackedDict[dataID]['vals']['duration'].push(this.getDuration(dataItems[dataID]))
              } else {
                // console.log("field", trackedDict[dataID]['field']);
                // console.log("vals", trackedDict[dataID]['vals']);
                trackedDict[dataID]['vals'][trackedDict[dataID]['field']].push(dataItems[dataID]);
              }
            } else {
              console.log("Not currently tracking " + dataID);
            }
          }
        }
      }
    }

    console.log("~~~~~~~~~~~~~ trackedDict");
    console.log(trackedDict);
    this.getDataToReport(trackedDict);
  }



  getDataToReport(trackedDict : {[dataID: string] : {[reportProps: string] : any}[]}){
    let dataIDs = Object.keys(trackedDict);
    let allAggregatedDataByTypes = {};

    console.log("@@@@@@@@@@ dataIDs");
    console.log(dataIDs);

    for (let i=0; i<dataIDs.length; i++) {
      let serialDataByTypes = trackedDict[dataIDs[i]]['vals'];
      let aggregatedDataByTypes = {};

      // console.log("~~~~~~~~~~ dataTrackingTypes");
      // console.log(serialDataByTypes);

      for (let j = 0; j < Object.keys(serialDataByTypes).length; j++) {
        let type = Object.keys(serialDataByTypes)[j];

        // console.log("~~~~~~~~~~~~~~~~~", serialDataByTypes[type]);
        // aggregatedDataByTypes[Object.keys(serialDataByTypes)[j]] = 0;

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
          } else if(type === 'numeric scale') {
            aggregatedDataByTypes[type]["totalValReported"] = this.getSum(serialDataByTypes[type]);
            aggregatedDataByTypes[type]["averageValReported"] = (aggregatedDataByTypes[type]["totalValReported"]
                / serialDataByTypes[type].length).toFixed(2);
          } else if(type === 'category scale') {
            aggregatedDataByTypes[type]["catCountsReported"] = {"Some": 0, "None": 0, "Lots": 0};
            for (let j=0; j<serialDataByTypes[type].length; j++) {
              aggregatedDataByTypes[type]["catCountsReported"][serialDataByTypes[type][j]]++;
            }
          } else if(trackedDict[dataIDs[i]]['field'] === 'time range') {
            let addedDurations = this.getSum(serialDataByTypes[type]);
            aggregatedDataByTypes[type]["averageValReported"] = (addedDurations
                / serialDataByTypes[type].length).toFixed(2);
            aggregatedDataByTypes[type]["averageTimeReported"] =
                this.dateFunctions.milisecondsToPrettyTime(aggregatedDataByTypes[type]["averageValReported"]);
          } else {
            console.log("#########");
            console.log(type);
          }
        }
      }
      allAggregatedDataByTypes[dataIDs[i]] = aggregatedDataByTypes;

      // this.filteredDataByID = trackedDict;
    }
    console.log("~~~~~~~~~~ allAggregatedDataByTypes");
    console.log(allAggregatedDataByTypes);

  }




  getSum(dataVals) : number {
    if (dataVals.length === 0) return null;
    return dataVals.reduce(function(a, b) {
      return Number(a) + Number(b);
    });
  }




  getDuration(timeRangeDict : {[timeEnds: string] : string}) : number{
    let earlyTime = timeRangeDict['start'];
    let lateTime = timeRangeDict['end'];
    if(earlyTime===undefined || lateTime === undefined){
      return 0;
    } else{
      return this.dateFunctions.getDuration(earlyTime, lateTime);
    }
  }










}
