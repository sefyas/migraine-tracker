import { Component } from '@angular/core';
import { Events } from 'ionic-angular';
import { ModalController, NavController, NavParams } from 'ionic-angular';
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { GoalTypePage } from "../addGoal/goal-type/goal-type";
import { LoginPage } from "../login/login";
import { TrackingPage } from '../tracking/tracking';
import { DataDetailsServiceProvider } from "../../providers/data-details-service/data-details-service";
import { DateFunctionServiceProvider } from "../../providers/date-function-service/date-function-service";
import { GlobalFunctionsServiceProvider } from "../../providers/global-functions-service/global-functions-service";
import { ConfiguredRoutine, DataElement } from "../../interfaces/customTypes";
import { Storage } from "@ionic/storage";
import * as moment from 'moment';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {
  private previouslyTracked : any;
  private quickTrackers : DataElement[] = [];
  private tracked : {[dataType : string] : any} = {};
  private trackedFields : any = {};
  private saving: boolean = false;
  dataToTrack : {[dataType : string] : DataElement[]} = {};
  dataList : {[dataType : string] : string} = {};
  dataTypes : string[];
  activeGoals : ConfiguredRoutine;
  cardExpanded : {[dataType : string] : boolean} = {};
  dateSelected : any;

  private goalProgresses : {[dataType : string] : any} = {};

  constructor (public navCtrl: NavController,
               private couchDbService: CouchDbServiceProvider,
               public navParams: NavParams,
               private dataDetialsProvider: DataDetailsServiceProvider,
               public dateFunctions: DateFunctionServiceProvider,
               private dateFunctionsProvider: DateFunctionServiceProvider,
               private globalFuns: GlobalFunctionsServiceProvider,
               private modalCtrl: ModalController,
               public events: Events,
               private storage: Storage) {
    if (this.navParams.data['dateSelected']) { // return from the sub tracking pages
      this.dateSelected = this.navParams.data['dateSelected'];
    } else {
      this.dateSelected = [moment().date(), moment().month(), moment().year()];
    }
    this.loadTrackedData();
  }

  async ionViewDidEnter() {
    var credentials = await this.storage.get('credentials').then((val) => {
      return val;
    });
    if (credentials != null) {
      this.couchDbService.login(credentials);
      this.loggedIn();
    } else {
      this.login();
    }
  }

  /**
   * Direct to the login page if there's no user credential info stored in cache
   */
  login() {
    let customDataModal = this.modalCtrl.create(LoginPage);
    customDataModal.onDidDismiss(() => {
      this.loggedIn();
    });
    customDataModal.present();
  }

  /**
   * Set up the app if there's cached user credential info
   */
  async loggedIn(){
    this.activeGoals = await this.couchDbService.fetchConfiguredRoutine().then((val) => {
      return val;
    });
    if (this.activeGoals !== null) {
      this.setupTrackers();
    }
  }

  /**
   * Load tracked data from the database into local memory
   */
  loadTrackedData() {
    //this.tracked = await this.couchDbService.fetchTrackedData(this.dateSelected);
    this.couchDbService.fetchTrackedData(this.dateSelected).then((trackingData)=>{
      this.tracked = trackingData['tracked_data'];
      //console.log("YSS HomePage - loadTrackedData tracked", this.tracked, "on ", this.dateSelected);
    });
  }

  remoteClearedData(goal, data) {
    this.saving = true;
    this.couchDbService.deleteData(goal, data, this.dateSelected)
        .then((result)=>{
          console.log("YSS HomePage - remoteClearedData resolved");
          this.saving = false
          if (result) {
            console.log("YSS TO-DO HomePage - remoteClearedData retured with true; show nothing")
          } else {
            console.log("YSS TO-DO HomePage - remoteClearedData retured with false; show an error icon so user knows the data is not removed")
          }
        });
  }

  /**
   * Save tracked data to the database
   */
  saveTrackedData() {
    this.saving = true;
    this.couchDbService.logTrackedData(this.tracked, this.trackedFields, this.dateSelected)
      .then((result)=>{
        //console.log("HomePage - saveTrackedData retured");
        this.saving = false
        if (result) {
          console.log("YSS TO-DO HomePage - saveTrackedData retured with true; show nothing")
        } else {
          console.log("YSS TO-DO HomePage - saveTrackedData retured with false; show an error icon so user knows the data is not saved")
        }
      });
  }

  /**
   * Called when a date is selected from the calendar
   * @param componentEvent
   */
  onDaySelectClick(componentEvent : any) {
    this.dateSelected = componentEvent;
    this.loadTrackedData();
  }

  /**
   * Called when the sub tracking pages for each goal is selected
   * @param goal
   */
  onTrackGoalClick(goal) {
    var nonEmptyDataTypes = [""];
    for (var i = 0; i < this.dataTypes.length; i++) {
      var dt = this.dataTypes[i];
      if ((this.dataList[dt] !== "") && (dt !== "quickTracker")) {
        nonEmptyDataTypes.push(dt);
      }
    }
    nonEmptyDataTypes.push("");
    var neighborData = {};
    for (i = 1; i < (nonEmptyDataTypes.length - 1); i++) {
      dt = nonEmptyDataTypes[i];
      neighborData[dt] = [nonEmptyDataTypes[i - 1], nonEmptyDataTypes[i + 1]];
    }

    let dataToSend = {
      "goal": goal,
      "dataTypes": this.dataTypes,
      "dataToTrack": this.dataToTrack,
      "dateSelected": this.dateSelected,
      "neighborData": neighborData
    };

    this.navCtrl.push(TrackingPage, dataToSend, {animate: false});
  }

  onEraseClick(data) {
    let dataType = this.inferTrackingCategory(data);
    //console.log("YSS HomePage - onEraseClick eraser icon clicked for goal", data['dataType'], " and data", data['name'], "data is", data, "among tracked data", this.tracked, "with value", this.tracked[dataType][data['id']]");
    delete this.tracked[dataType][data['id']];
    // YSS TO-DO if this.tracked[goal] is empty after deletion, remove it
    this.remoteClearedData(dataType, data);
  }

  /**
   * Add goals/tracking routines if the user doesn't have so yet
   */
  configureGoals() {
    this.navCtrl.push(GoalTypePage, null, {animate: false});
  }

  /**
   * Get data about as-needed medications
   */
  getTrackedMeds(){
    return this.globalFuns.getWhetherTrackedMeds(this.tracked);
  }

  /**
   * Get data value
   * @param data
   */
  getDataVal(data) {
    let dataType = this.inferTrackingCategory(data);
    //console.log("YSS HomePage - getDataVal for data", data, "with inferred dataType", dataType, "when tracked is", this.tracked, "for dataToTrack", this.dataToTrack);
    if (this.tracked[dataType] && this.tracked[dataType][data.id] && (typeof this.tracked[dataType][data.id] !== typeof {})) {
      //console.log("YSS HomePage - getDataVal returning", this.tracked[dataType][data.id],"for data:", data, "and tracked:", this.tracked, "dataToTrack is", this.dataToTrack, "date selected is:", this.dateSelected);
      return this.tracked[dataType][data.id];
    } else {
      //console.log("YSS HomePage - getDataVal returning null for data:", data, "and tracked:", this.tracked, "dataToTrack is", this.dataToTrack, "date selected is:", this.dateSelected);
      return null;
    }
  }

  /**
   * Get start time
   * @param data
   */
  getDataStart(data) {
    if (this.tracked[data.dataType] && this.tracked[data.dataType][data.id] && (typeof this.tracked[data.dataType][data.id] === typeof {})) {
      return this.tracked[data.dataType][data.id]['start'];
    } else {
      return null;
    }
  }

  /**
   * Get end time
   * @param data
   */
  getDataEnd(data) {
    if (this.tracked[data.dataType] && this.tracked[data.dataType][data.id] && (typeof this.tracked[data.dataType][data.id] === typeof {})) {
      return this.tracked[data.dataType][data.id]['end'];
    } else {
      return null;
    }
  }

  /**
   * infers category of data (i.e. one of Symptom, Treatment, Contributor, Change, Other)
   * this is a temporary fix for the fact that 'dataType' is not available for all quickTrack items
  */
  inferTrackingCategory(data){
    let category = null;
    let found = false;
    for (const trackingCategory in this.dataToTrack) { 
      if(trackingCategory === 'quickTracker'){
        continue;
      }

      for(const trackingData of this.dataToTrack[trackingCategory]){
        if(!trackingData.hasOwnProperty('id')){
          console.log("YSS HomePage - inferTrackingCategory no id for", trackingData);
          continue;
        }

        if(data['id'] === trackingData['id']){
          //console.log("\tYSS HomePage - inferTrackingCategory inferred category is", trackingCategory);
          category = trackingCategory
          found = true
          break;
        }
      }

      if(found){
        break;
      }
    }

    return category;
  }

  /**
   * Change data values
   * @param componentEvent
   * @param data
   * @param dataType
   */
  changeVals (componentEvent : {[eventPossibilities: string] : any}, 
              data : {[dataProps: string] : any},
              dataType: string) {
    //console.log("YSS HomePage - changeVals data:", data, "with inferred catgory", this.inferTrackingCategory(data), "for dataType:", dataType, "when tracked is", this.tracked, "under dataToTrack", this.dataToTrack);
    if (dataType === 'quickTracker') {
      // YSS finding the dataType as it turns data['dataType'] is only available for Migraine among all the quickTracker items
      dataType = this.inferTrackingCategory(data);
      // YSS TO-DO consider returning null if dataType is null 
    }
    if (!this.tracked.hasOwnProperty(dataType)) {
      this.tracked[dataType] = {};
    }
    if (componentEvent['dataVal']) {
      this.tracked[dataType][data['id']] = componentEvent['dataVal'];
    }
    if (componentEvent['dataStart']) {
      if (!this.tracked[dataType].hasOwnProperty(data['id'])) {
        this.tracked[dataType][data['id']] = {};
      }
      this.tracked[dataType][data['id']]['start'] = componentEvent['dataStart'];
    }
    if (componentEvent['dataEnd']) {
      if (!this.tracked[dataType].hasOwnProperty(data['id'])) {
        this.tracked[dataType][data['id']] = {};
      }
      this.tracked[dataType][data['id']]['end'] = componentEvent['dataEnd'];
    }
    if (!this.trackedFields.hasOwnProperty(dataType)) {
      this.trackedFields[dataType] = {};
    }
    this.trackedFields[dataType][data['id']] = data['field'];
    this.saveTrackedData();
  }

  /**
   * Calculate progress to the limit/goal
   * @param data
   * @param dataType
   */
  goalProgress(data : {[dataProps : string] : any}, dataType :string) {
    let timesTracked = this.totalTrackedTimes(data, dataType);
    if (timesTracked > data.goal.threshold) {
      if (data.goal.freq === 'More') {
        return 'met';
      }
      return 'over'
    } else if(timesTracked === data.goal.threshold) {
      if (data.goal.freq === 'More') {
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

  /**
   * Set up the trackers
   */
  async setupTrackers() {
    if (this.activeGoals['dataToTrack']) {
      this.previouslyTracked = await this.couchDbService.fetchTrackedDataRange(
        this.dateFunctions.getMonthAgo(new Date()).toISOString(),
        this.dateFunctions.getDayAgo(new Date()).toISOString());
      this.quickTrackers = this.activeGoals['quickTrackers'];
      if (this.quickTrackers && this.quickTrackers.length > 0) {
        this.dataTypes = ['quickTracker'];
      } else {
        console.log("NO QUICK TRACKERS?!")
      }
      this.dataToTrack = Object.assign({}, this.activeGoals['dataToTrack']); // otherwise we modify it >.<
      this.dataTypes = this.dataTypes.concat(Object.keys(this.dataToTrack));
      this.dataToTrack["quickTracker"] = this.quickTrackers;
      this.setupPriorDataRecord();
    }
  }

  /**
   * Calculate the total tracked times given data
   * @param data
   * @param dataType
   */
  totalTrackedTimes(data: {[dataProps : string] : any}, dataType : string) : Number {
    if (dataType === 'quickTracker') dataType = data.dataType;
    let timesSoFar = this.goalProgresses[dataType] ? this.goalProgresses[dataType][data.id] : 0;
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
   * For each data type, store its data name
   * For data with configured goal, calculate its prior progresses
   */
  setupPriorDataRecord() {
    for (let i = 0; i < this.dataTypes.length; i++) {
      let dataType = this.dataTypes[i];
      if (dataType === 'quickTracker') continue;
      this.goalProgresses[dataType] = {};
      this.setupDataList(dataType);
      this.calculatePriorDataProgresses(dataType);
    }
  }

  /**
   * Store data names in a list
   * @param dataType
   */
  setupDataList(dataType) {
    this.dataList[dataType] = this.dataToTrack[dataType].filter(function(x) {
      if (!x.quickTrack) return x;
    }).map(x => x.name).join(", ");
  }

  /**
   * For data with configured goal, calculate its prior progresses
   * @param dataType
   */
  calculatePriorDataProgresses(dataType) {
    for (let j = 0; j < this.dataToTrack[dataType].length; j++) {
      let data = this.dataToTrack[dataType][j];
      if (data.id === 'frequentMedUse') {
        this.goalProgresses[dataType][data.id] =
          this.globalFuns.calculatePriorGoalProgress(data, '', this.previouslyTracked);
      } else if (data.goal && data.goal.freq) {
        this.goalProgresses[dataType][data.id] =
          this.globalFuns.calculatePriorGoalProgress(data, dataType, this.previouslyTracked);
      }
    }
  }
}
