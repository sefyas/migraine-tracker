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
  private activeGoals : ConfiguredRoutine;
  private quickTrackers : DataElement[] = [];
  private tracked : {[dataType : string] : any} = {};
  private trackedFields : any = {};
  private dataToTrack : {[dataType : string] : DataElement[]} = {};
  private dataList : {[dataType : string] : string} = {};
  private dataTypes : string[];
  private previouslyTracked : any;
  private cardExpanded : {[dataType : string] : boolean} = {};
  private dateSelected : any;

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
  async loadTrackedData() {
    this.tracked = await this.couchDbService.fetchTrackedData(this.dateSelected);
  }

  /**
   * Save tracked data to the database
   */
  saveTrackedData() {
    this.couchDbService.logTrackedData(this.tracked, this.trackedFields, this.dateSelected);
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
    if (this.tracked[data.dataType] && this.tracked[data.dataType][data.id] && (typeof this.tracked[data.dataType][data.id] !== typeof {})) {
      return this.tracked[data.dataType][data.id];
    } else {
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
   * Change data values
   * @param componentEvent
   * @param data
   * @param dataType
   */
  changeVals (componentEvent : {[eventPossibilities: string] : any}, data : {[dataProps: string] : any},
              dataType: string) {
    if (dataType === 'quickTracker') {
      dataType = data['dataType'];
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
