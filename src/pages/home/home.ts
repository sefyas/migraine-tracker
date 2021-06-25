import { Component } from '@angular/core';
import { Events } from 'ionic-angular';
import { ModalController, NavController, NavParams } from 'ionic-angular';
import { Storage } from "@ionic/storage";
import * as moment from 'moment';
import * as $ from "jquery";

import { GoalTypePage } from "../addGoal/goal-type/goal-type";
import { LoginPage } from "../login/login";
import { TrackingPage } from '../tracking/tracking';

import { ConfiguredRoutine, DataElement } from "../../interfaces/customTypes";

import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { DataDetailsServiceProvider } from "../../providers/data-details-service/data-details-service";
import { DateFunctionServiceProvider } from "../../providers/date-function-service/date-function-service";
import { GlobalFunctionsServiceProvider } from "../../providers/global-functions-service/global-functions-service";

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
  private JQstatus: boolean = false;
  private saveSuccess: boolean = false;
  dataToTrack : {[dataType : string] : DataElement[]} = {};
  dataList : {[dataType : string] : string} = {};
  dataTypes : string[];
  activeGoals : ConfiguredRoutine;
  cardExpanded : {[dataType : string] : boolean} = {};
  dateSelected : any;

  private goalProgresses : {[dataType : string] : any} = {};

  public trackedDataChanges : {[property : string] : any} = {};

  constructor (public navCtrl: NavController,
               private couchDbService: CouchDbServiceProvider,
               public navParams: NavParams,
               private dataDetialsProvider: DataDetailsServiceProvider,
               public dateFunctions: DateFunctionServiceProvider, // YSS why is this public?
               //private dateFunctionsProvider: DateFunctionServiceProvider, // YSS redundant
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
    //console.log('YSS HomePage - constructor: isToday?', this.dateFunctions.isToday(this.dateSelected[2], this.dateSelected[1], this.dateSelected[0]));
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

  ngAfterViewInit(){
    let homePageObjectRef = this;
    $(document).ready(function(){
      homePageObjectRef.JQstatus = true;
      //console.log('YSS HomePage - ngAfterViewInit: Home view is initialized, and JQuery is thus ready.', document, this, homePageObjectRef);
      console.log('YSS HomePage - ngAfterViewInit: Home view is initialized, and JQuery is thus ready.');
    });
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
    //console.log('YSS HomePage - loggedIn: called');
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

  feedbackOnSave(){
    let homePageObjectRef = this;
    if(this.JQstatus){ 
      console.log("YSS HomePage - feedbackOnSave: called");
      $("#jqtest").fadeIn(200, 'swing', function(){
        console.log("YSS HomePage - feedbackOnSave: fadeIn", homePageObjectRef.saveSuccess);
        $("#jqtest").fadeOut(800, 'swing', function(){
          homePageObjectRef.saveSuccess = false;
          console.log("YSS HomePage - feedbackOnSave: fadeOut", homePageObjectRef.saveSuccess);
        });
      }); // NOTE the sum of these values equals the intentional delay when saving in DB
    }
  }

  removeClearedData(goal, data) {
    this.saving = true;
    console.log('YSS HomePage - removeClearedDatatracked: tracked', this.tracked, 'trackedFields', this.trackedFields, 'on date', this.dateSelected, 'for routine', this.dataToTrack);
    this.couchDbService.deleteData(goal, data, this.dateSelected)
        .then(changes => { // data is saved on DB
          this.saving = false;
          this.saveSuccess = true; // success sign (check-mark)
          console.log("YSS HomePage - removeClearedData: retured with changes ", changes);
          return changes;
        })
        .catch(err => { // data is not saved on DB
          this.saveSuccess = false; // error sign (exclamation)
          console.log("YSS HomePage - removeClearedData: retured with error", err);
        })
        .then(changes => {
          //YSS TO-DO show sign of success / error
          this.feedbackOnSave(); // NOTE we go down the promise chain indepent of resolution or rejection
          //this.couchDbService.logUsage('data', changes);
          //console.log("YSS HomePage - removeClearedData: logged changes", changes);
          if(changes && Object.keys(changes).length){
            //YSS NOTE no need to provide dtype with changes in this case
            //console.log("YSS HomePage - saveTrackedData: non-empty changes stored in ");
            this.trackedDataChanges = {'changes': changes, 'date': this.dateSelected};
          }
          return changes;
        })
        .then(changes => {        
          //console.log("YSS HomePage - removeClearedData: changes", changes, "tracked", this.tracked, "dataToTrack", this.dataToTrack);
          this.updateProgress(changes);
        });
  }

  /**
   * Save tracked data to the database
   */
  saveTrackedData() {
    this.saving = true;
    console.log('YSS HomePage - saveTrackedData: tracked', this.tracked, 'trackedFields', this.trackedFields, 'on date', this.dateSelected, 'for routine', this.dataToTrack)
    this.couchDbService.logTrackedData(this.tracked, this.trackedFields, this.dateSelected)
      .then((changes)=>{ // data is saved on DB
        this.saving = false
        this.saveSuccess = true; // success sign (check-mark)
        console.log("YSS HomePage - saveTrackedData: received changes:", changes);
        return changes;         
      })
      .catch(err => { // data is not saved on DB
        this.saveSuccess = false; // error sign (exclamation)
        console.log("YSS HomePage - saveTrackedData: retured with error:", err);
      })
      .then(changes => { // log changes
        //YSS TO-DO show sign of success / error
        this.feedbackOnSave(); // NOTE we go down the promise chain indepent of resolution or rejection
        //this.couchDbService.logUsage('data', changes);
        //console.log("YSS HomePage - saveTrackedData: logged changes", changes);
        if(changes && Object.keys(changes).length){
          for(let category in Object(changes)){
            for(let behavior in changes[category]){
              let info = this.dataToTrack[category].find(element => element['id'] === behavior);
              changes[category][behavior]['dtype'] = info ? info['field'] : null;
              //console.log('YSS HomePage - saveTrackedData: update datatype info', info, 'for', behavior, 'of', category);
              // YSS - TO-DO it's better to specify dtype in changes within DB service
            }
          }
          this.trackedDataChanges = {'changes': changes, 'date': this.dateSelected};
        }
        return changes;
      })
      .then(changes => { // update progress    
        //console.log("YSS HomePage - saveTrackedData: changes", changes, "tracked", this.tracked, "dataToTrack", this.dataToTrack);
        this.updateProgress(changes);
      });
  }

  updateProgress(changes){
    //console.log("YSS HomePage - updateProgress: considering changes", changes, "to update progress", this.goalProgresses);
    for(const category in Object(changes)){
      for(const behavior in changes[category]){
        let update = this.calculateUpdate(changes, category, behavior);
        if (update) {
          //console.log('YSS HomePage - updateProgress: update for', behavior, '/', category, 'is:', update);
          if(!this.goalProgresses.hasOwnProperty(category)){
            this.goalProgresses[category] = {};
            console.log('YSS HomePage - updateProgress: no progress recorded for behaviors in', category, '... adding it in.');
          }
          if(!this.goalProgresses[category].hasOwnProperty(behavior)){
            this.goalProgresses[category][behavior] = update;
            console.log('YSS HomePage - updateProgress: no progress recorded for behavior', behavior, '/', category, '... initializing it with', update);
          } else {
            let temp = this.goalProgresses[category][behavior];
            this.goalProgresses[category][behavior] += update;
            //console.log('YSS HomePage - updateProgress: progress for behavior', behavior, '/', category, 'updated from', temp, 'to', this.goalProgresses[category][behavior]);
          }
        } else {
          console.log('YSS HomePage - updateProgress: no update for', behavior, '/', category);
        }
      }
    }
  }

  calculateUpdate(changes, category, behavior){
    let update = null;
    
    // check if there is a limit for the behavior
    let info = this.dataToTrack[category].find(element => element['id'] === behavior);
    let hasLimit;
    if(   info.hasOwnProperty('goal') 
       && info['goal'].hasOwnProperty('freq') 
       && info['goal'].hasOwnProperty('threshold') 
       && info['goal'].hasOwnProperty('timespan')){
      hasLimit =    info['goal']['freq'] !== null 
                 && info['goal']['threshold'] !== null 
                 && info['goal']['timespan'] !== null;
    } else {
      hasLimit = false;
    }
    //console.log('YSS HomePage - calculateUpdate: is there limit for', behavior, '/', category,'?', hasLimit ? 'Yes': 'No', 'full info', info);

    // if there is a limit, we want to know the change that can potentially 
    // influence progress to-date
    let change;
    if(hasLimit){ 
      let type = info['field'];
      let value1 = changes[category][behavior]['from'];
      let value2 = changes[category][behavior]['to'];
      if (type === 'binary'){
        value1 = (value1 === 'Yes')? 1: 0;
        value2 = (value2 === 'Yes')? 1: 0;
      } else if(type === 'number') {
        value1 = Number(value1);
        value2 = Number(value2);
      } else {
        // NOTE the following line assumes only behaviors of type number or
        //      binary Yes/No can have limits
        console.log('YSS HomePage - calculateUpdate: limit incorrectly set for a non-binary, not a number behavior');
        value1 = null;
        value2 = null;
      }
      
      if(value1 !== null && value2 !== null) change = value2 - value1;
      //console.log('YSS HomePage - calculateUpdate: change for', behavior, '/', category,'from', value1, 'to', value2, 'is', change);
    }

    // if there is a change of a behavior for which we have limit, 
    // we want to consider if the update is happening within the 
    // timespan of interest.
    let withinSpan = false;
    if(hasLimit){
      let span = info['goal']['timespan'][0].toLowerCase();
      if (span === 'd') span = 'day';
      else if (span === 'w') span = 'week';
      else if (span === 'm') span = 'month';
      else {
        console.log('YSS HomePage - calculateUpdate: invalid timespan');
        return null;
      }
      let cutoff = this.dateFunctions.dateArithmatic(new Date(), 'subtract', 1, span);
      let dateSelected = {'year': this.dateSelected[2],'month': this.dateSelected[1],'day': this.dateSelected[0]};
      withinSpan = this.dateFunctions.dateGreaterOrEqual(dateSelected, cutoff);
      //console.log('YSS HomePage - calculateUpdate: is change for', behavior, '/', category,'within timespan?', withinSpan ? 'Yes;': 'No', 'cutoff for span', span, 'is', cutoff, 'date selected is', dateSelected);
    }

    // If there is a limit for a behavior and there is a non-zero change within the timespan 
    // of interest, we want to consider an update
    if(hasLimit && withinSpan && change) update = change;
    return update;
  }

  getProgress(data, dataType, context){
    let category = this.inferTrackingCategory(data);
    let behavior = data['id'];
    //console.log('YSS HomePage - getProgress: progress in context', context, 'for', behavior, 'is', this.goalProgresses[category][behavior]);
    //console.log('YSS HomePage - getProgress: in context', context, 'for', behavior, 'of', category, 'with calculated progress', this.goalProgresses);
    return this.goalProgresses[category][behavior];
  }

  getProgressMsg(data, dataType, context) {
    let category = this.inferTrackingCategory(data);
    let behavior = data['id'];
    let msg;
    if(   this.goalProgresses.hasOwnProperty(category) 
       && this.goalProgresses[category].hasOwnProperty(behavior)){
      if(   data.hasOwnProperty('goal') 
         && data['goal'].hasOwnProperty('freq')
         && data['goal'].hasOwnProperty('threshold')){
        let freq = data['goal']['freq'].toLowerCase();
        if( freq === 'more'){
          if(this.goalProgresses[category][behavior] > data['goal']['threshold']) msg = 'met';
          else if(this.goalProgresses[category][behavior] < data['goal']['threshold']) msg = 'under';
          else msg = 'at-more';
        } else if(freq === 'less') {
          if(this.goalProgresses[category][behavior] > data['goal']['threshold']) msg = 'over';
          else if(this.goalProgresses[category][behavior] < data['goal']['threshold']) msg = 'met';
          else msg = 'at-less';
        }
      }
    }
    //console.log('YSS HomePage - getProgressMsg: under context', context, 'for', category, 'with data', behavior, 'msg is', msg, 'for progress', this.goalProgresses[category][behavior]);
    return msg;
  }

  /**
   * Called when a date is selected from the calendar
   * @param componentEvent
   */
  onDaySelectClick(componentEvent : any) {
    //console.log('YSS HomePage - onDaySelectClick: called with input', componentEvent);
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
    //console.log('YSS HomePage - onEraseClick: eraser icon clicked with input', data,'; deleting category', data['dataType'], 'behavior', data['name'], 'in tracked data', this.tracked);
    if (!this.tracked){
      console.log('YSS HomePage - onEraseClick: tracked is undefined or null so nothing happens');
      return;
    }
    if(Object.keys(this.tracked).length === 0) {
      console.log('YSS HomePage - onEraseClick: tracked is empty so nothing happens');
      return;
    }
    let dataType = this.inferTrackingCategory(data);
    if(!this.tracked.hasOwnProperty(dataType)) {
      console.log('YSS HomePage - onEraseClick: no category', dataType, 'in tracked data', this.tracked);
      return;
    }
    delete this.tracked[dataType][data['id']];
    // YSS TO-DO consider if this.trackedFields should also be updated
    this.removeClearedData(dataType, data);
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
          console.log("YSS HomePage - inferTrackingCategory: no id for", trackingData);
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

  isToday(){
    return this.dateFunctions.isToday(this.dateSelected[2],this.dateSelected[1], this.dateSelected[0]);
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
  goalProgress(data : {[dataProps : string] : any}, dataType :string, context:string='undefined') {
    let timesTracked = this.totalTrackedTimes(data, dataType, 'gp-'+context);
    //console.log('YSS HomePage - goalProgress: under context', context,'timesTracked', timesTracked, 'for', dataType, 'with data', data['id']);
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
    //console.log('YSS HomePage - setupTrackers: called');
    if (this.activeGoals['dataToTrack']) {
      let month = this.dateFunctions.getMonthAgo(new Date()).toISOString();
      //let day = this.dateFunctions.getDayAgo(new Date()).toISOString();
      let day = this.dateFunctions.getDate(new Date()).toISOString();
      this.previouslyTracked = await this.couchDbService.fetchTrackedDataRange(month, day);
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
  totalTrackedTimes(data: {[dataProps : string] : any}, dataType : string, context:string='undefined') : Number {
    //console.log('YSS HomePage - totalTrackedTimes: context', context, 'data', data, 'dataType', dataType);
    //console.log('YSS HomePage - totalTrackedTimes: context', context, 'for', data.id);
    if (dataType === 'quickTracker') dataType = this.inferTrackingCategory(data);
    let timesSoFar = this.goalProgresses[dataType] ? this.goalProgresses[dataType][data.id] : 0;
    if (data.id === 'frequentMedUse') { // we pull from the 'treatments' dict!
      //console.log('YSS HomePage - totalTrackedTimes: context', context, 'in frequentMedUse branch')
      timesSoFar += (this.getTrackedMeds() ? 1 : 0);
    } else if (this.tracked[dataType] && this.tracked[dataType][data.id]) {
      if (data.field === 'number') {
        //console.log('YSS HomePage - totalTrackedTimes: context', context, 'in number branch')
        timesSoFar += Number(this.tracked[dataType][data.id]);
      } else if (data.field !== 'binary' || this.tracked[dataType][data.id] === 'Yes') {
        timesSoFar += 1;
        //console.log('YSS HomePage - totalTrackedTimes: context', context, 'incremented by 1 to', timesSoFar, 'for', data.id);
      }
    }
    return timesSoFar;
  }

  /**
   * For each data type, store its data name
   * For data with configured goal, calculate its prior progresses
   */
  setupPriorDataRecord() {
    //console.log('YSS HomePage - setupPriorDataRecord: called to calculated progress for today.');
    for (let i = 0; i < this.dataTypes.length; i++) {
      let dataType = this.dataTypes[i];
      if (dataType === 'quickTracker') continue;
      this.goalProgresses[dataType] = {};
      this.setupDataList(dataType);
      this.calculatePriorDataProgresses(dataType);
    }
    //console.log('YSS HomePage - setupPriorDataRecord: progress based on prior data is', this.goalProgresses);
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
    //console.log('YSS HomePage - calculatePriorDataProgresses: previouslyTracked', this.previouslyTracked, 'dataToTrack', this.dataToTrack);
    // YSS TO-DO this is terrible style; dataToTrack is a dict so use for data in this.dataToTrack[dataType]
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
    //console.log('YSS HomePage - calculatePriorDataProgresses: goalProgresses', this.goalProgresses);
  }
}
