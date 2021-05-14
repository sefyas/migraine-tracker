import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';
import {HomePage} from "../home/home";
import {ConfiguredRoutine, DataElement} from "../../interfaces/customTypes";
import {GlobalFunctionsServiceProvider} from "../../providers/global-functions-service/global-functions-service";
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {DataDetailsServiceProvider} from "../../providers/data-details-service/data-details-service";
import {DateFunctionServiceProvider} from "../../providers/date-function-service/date-function-service";

/**
 * Generated class for the TrackingPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-tracking',
  templateUrl: 'tracking.html',
})
export class TrackingPage {
  private tracked : {[dataType : string] : any} = {};
  private trackedFields : any = {};
  private goalProgresses : {[dataType : string] : any} = {};
  private previouslyTracked : any;
  private saving: boolean = false;
  dataToTrack : {[dataType : string] : DataElement[]} = {};
  dateSelected : any;
  goal : any;
  neighborData: any;
  monthNames : string[] = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              private couchDbService: CouchDbServiceProvider,
              public viewCtrl: ViewController,
              private dataDetialsProvider: DataDetailsServiceProvider,
              private dateFunctionsProvider: DateFunctionServiceProvider,
              public dateFunctions: DateFunctionServiceProvider,
              private globalFuns: GlobalFunctionsServiceProvider) {
    this.dataToTrack = navParams.get('dataToTrack');
    this.dateSelected = navParams.get('dateSelected');
    this.goal = navParams.get('goal');
    this.neighborData = navParams.get('neighborData');
    this.loadTrackedData();
    this.calculatePriorDataProgresses();
  }

  ionViewDidLoad() {
  }

  // ================= BUTTONS Start =================
  onHomeClick() {
    let dataToSend = {"goal": this.goal,
      "dataToTrack": this.dataToTrack,
      "dateSelected": this.dateSelected,
      "neighborData": this.neighborData};

    this.navCtrl.setRoot(HomePage, dataToSend, {animate: false});
  }

  onPreviousClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][0],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {animate: false});
  }

  onNextClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][1],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {animate: false});
  }

  onClearClick() {
    this.tracked = {};
  }

  onEraseClick(goal, data) {
    //console.log("eraser icon clicked for goal", goal, " and data", data);
    //console.log("value for this goal-data is", this.tracked[goal][data['id']], "among tracked data", this.tracked);
    delete this.tracked[goal][data['id']];
    // YSS TO-DO if this.tracked[goal] is empty after deletion, remove it
    this.remoteClearedData(goal, data);
  }
  // ================= BUTTONS Ends =================
  loadTrackedData() {
    //this.tracked = await this.couchDbService.fetchTrackedData(this.dateSelected);
    this.couchDbService.fetchTrackedData(this.dateSelected).then((trackingData)=>{
      this.tracked = trackingData['tracked_data'];
    });
  }

  remoteClearedData(goal, data) {
    this.saving = true;
    this.couchDbService.deleteData(goal, data, this.dateSelected)
        .then((result)=>{
          console.log("YSS tracking/remoteClearedData resolved");
          this.saving = false
          if (result) {
            console.log("YSS TO-DO tracking/remoteClearedData retured with true; show nothing")
          } else {
            console.log("YSS TO-DO tracking/remoteClearedData retured with false; show an error icon so user knows the data is not removed")
          }
        });
        /*.then((changes)=>{
          this.saving = false;
          console.log("YSS TrackingPage - remoteClearedData: retured with changes ", changes);
          //return changes; //YSS TO-DO further work on the logging call; 
          //YSS TO-DO show check-mark sign
        })
        .catch(err => {
          console.log("YSS TrackingPage - remoteClearedData: retured with error", err)
          //YSS TO-DO show error sign
        })
        //.then(changes => this.couchDbService.logUsage(changes)); //YSS TO-DO further work on the logging call; ;
        */
  }

  saveTrackedData() {
    this.saving = true;
    console.log('YSS TrackingPage - saveTrackedData: tracked', this.tracked, 'trackedFields', this.trackedFields, 'on date', this.dateSelected)
    this.couchDbService.logTrackedData(this.tracked, this.trackedFields, this.dateSelected)
      .then((changes)=>{
        this.saving = false
        console.log("YSS TrackingPage - saveTrackedData: retured with changes ", changes);
        //return changes; //YSS TO-DO further work on the logging call; 
        //YSS TO-DO show check-mark sign
      })
      .catch(err => {
        console.log("YSS TrackingPage - saveTrackedData: retured with error", err);
        //YSS TO-DO show error sign
      })
      //.then(changes => this.couchDbService.logUsage(changes)); //YSS TO-DO further work on the logging call; 
  }

  getTrackedMeds(){
    return this.globalFuns.getWhetherTrackedMeds(this.tracked);
  }

  getDataVal(dataID) {
    //console.log('YSS dataVal setup for goal ', this.goal, ' by the associated tracked content', this.tracked[this.goal], 'for data ID ', dataID);
    if (this.tracked[this.goal] && this.tracked[this.goal][dataID] && (typeof this.tracked[this.goal][dataID]
        !== typeof {})) {
      return this.tracked[this.goal][dataID];
    } else {
      return null;
    }
  }

  getDataStart(dataID) {
    if (this.tracked[this.goal] && this.tracked[this.goal][dataID] && (typeof this.tracked[this.goal][dataID]
        === typeof {})) {
      return this.tracked[this.goal][dataID]['start'];
    } else {
      return null;
    }
  }

  getDataEnd(dataID) {
    if (this.tracked[this.goal] && this.tracked[this.goal][dataID] && (typeof this.tracked[this.goal][dataID]
        === typeof {})) {
      return this.tracked[this.goal][dataID]['end'];
    } else {
      return null;
    }
  }

  changeVals (componentEvent : {[eventPossibilities: string] : any}, data : {[dataProps: string] : any},
              dataType: string) {
    //console.log("YSS tracking page with event ", componentEvent, " and data ", data);
    if (dataType === 'quickTracker') {
      dataType = data.dataType;
    }
    if (!this.tracked.hasOwnProperty(dataType)) {
      this.tracked[dataType] = {};
    }
    if (componentEvent.dataVal) {
      this.tracked[dataType][data.id] = componentEvent.dataVal;
    }
    if (componentEvent.dataStart) {
      if (!this.tracked[dataType].hasOwnProperty(data.id)) {
        this.tracked[dataType][data.id] = {};
      }
      this.tracked[dataType][data.id]['start'] = componentEvent.dataStart;
    }
    if (componentEvent.dataEnd) {
      if (!this.tracked[dataType].hasOwnProperty(data.id)) {
        this.tracked[dataType][data.id] = {};
      }
      this.tracked[dataType][data.id]['end'] = componentEvent.dataEnd;
    }
    if (!this.trackedFields.hasOwnProperty(dataType)) {
      this.trackedFields[dataType] = {};
    }
    this.trackedFields[dataType][data['id']] = data['field'];
    this.saveTrackedData();
  }

  formatForCalendar(event){ // call when we push to couch ...
    let startAndEndDates = this.dateFunctionsProvider.getStartAndEndDatesForCalendar();
    event['startTime'] = startAndEndDates[0];
    event['endTime'] = startAndEndDates[1];
    event['allDay'] = true;
    event['title'] = this.globalFuns.getWhetherMigraine(event['Symptom']) ? 'Migraine' : 'No Migraine';
    return event;
  }

  addDurationItems(durationDict : {[dataID : string] : any}, endPoint : string){ // call when we push to couch ...
    let dataNames = Object.keys(durationDict);
    for(let i=0; i<dataNames.length; i++){
      if(!this.tracked[dataNames[i]]){
        this.tracked[dataNames[i]] = {};
      }
      this.tracked[dataNames[i]][endPoint] = durationDict[dataNames[i]];
    }
  }

  goalProgress(data : {[dataProps : string] : any}, dataType :string){
    let timesTracked = this.totalTrackedTimes(data, dataType);
    if (timesTracked > data.goal.threshold) {
      if(data.goal.freq === 'More'){
        return 'met';
      }
      return 'over'
    } else if(timesTracked === data.goal.threshold){
      if(data.goal.freq === 'More'){
        return 'met';
      }
      return 'at limit';
    } else {
      if (data.goal.freq === 'More') {
        return 'under';
      }
      return 'below limit';
    }
  }

  totalTrackedTimes(data: {[dataProps : string] : any}, dataType : string) : Number{
    if (dataType === 'quickTracker') dataType = data.dataType;
    let timesSoFar = this.goalProgresses ? this.goalProgresses[data.id] : 0;
    if (data.id === 'frequentMedUse') { // we pull from the 'treatments' dict!
      timesSoFar += (this.getTrackedMeds() ? 1 : 0);
    } else if (this.tracked[dataType] && this.tracked[dataType][data.id]) {
      if (data.field === 'number') {
        timesSoFar += Number(this.tracked[dataType][data.id]);
      } else if (data.field !== 'binary' || this.tracked[dataType][data.id] === 'Yes') {
        timesSoFar += 1;
      }
    }
    return timesSoFar;
  }

  /**
   * For data with configured goal, calculate its prior progresses
   * @param dataType
   */
  async calculatePriorDataProgresses() {
    this.previouslyTracked = await this.couchDbService.fetchTrackedDataRange(
        this.dateFunctions.getMonthAgo(new Date()).toISOString(),
        this.dateFunctions.getDayAgo(new Date()).toISOString());
    for (let j = 0; j < this.dataToTrack[this.goal].length; j++) {
      let data = this.dataToTrack[this.goal][j];
      if (data.id === 'frequentMedUse') {
        this.goalProgresses[data.id] =
          this.globalFuns.calculatePriorGoalProgress(data, '', this.previouslyTracked);
      } else if (data.goal && data.goal.freq) {
        this.goalProgresses[data.id] =
          this.globalFuns.calculatePriorGoalProgress(data, this.goal, this.previouslyTracked);
      }
    }
  }
}
