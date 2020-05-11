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
// import { Calendar } from '@ionic-native/calendar/ngx';
import { NgCalendarModule  } from 'ionic2-calendar';
import {SignUpPage} from "../signup/signup";
import {c} from "@angular/core/src/render3";
import {GoalModificationPage} from "../goal-modification/goal-modification";
import {DataConfigPage} from "../addGoal/data-config/data-config";
import * as moment from 'moment';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {
  private skipConfig = false;
  // private skipConfig = true;

  private activeGoals : ConfiguredRoutine;
  private quickTrackers : DataElement[] = [];
  private tracked : {[dataType : string] : any} = {};
  private goalProgresses : {[dataType : string] : any} = {};
  private dataToTrack : {[dataType : string] : DataElement[]} = {};
  private dataList : {[dataType : string] : string} = {};
  private dataTypes : string[];
  private previouslyTracked : {[dataType : string] : any}[];
  // private somethingTracked : boolean;
  private durationItemStart : {[dataType : string] : any} = {};
  private durationItemEnd : {[dataType : string] : any} ={};
  private cardExpanded : {[dataType : string] : boolean} = {};
  private saved : boolean;
  private dateSelected : any;


  constructor(public navCtrl: NavController,
              private couchDbService: CouchDbServiceProvider,
              public navParams: NavParams,
              private dataDetialsProvider: DataDetailsServiceProvider,
              private dateFunctionsProvider: DateFunctionServiceProvider,
              private globalFuns: GlobalFunctionsServiceProvider,
              private modalCtrl: ModalController,
              public events: Events,
              private storage: Storage) {
    this.dateSelected = {"date": moment().date(), "month": moment().month(), "year": moment().year(),
                         "isThisMonth" : true, "isSelect": true, "isToday": false}
  }

  async ionViewDidEnter() {
    if(this.navParams.data['goalIDs']){ // Came from setting a goal up.  todo: notification stuff
      this.events.publish('configSeen');
      console.log(this.navParams.data);
      this.activeGoals = this.couchDbService.addGoalFromSetup(this.navParams.data);
      this.setupTrackers();
    }
    else{
      // Fetch the credentials from the cache
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
  }

  login() {
    let customDataModal = this.modalCtrl.create(LoginPage);
    customDataModal.onDidDismiss(() => {
      this.loggedIn();
    });
    customDataModal.present();
  }

  async loggedIn(){
    // if (this.skipConfig) {
    //   this.events.publish('configSeen');
    // } // just jumps to ex goals
    this.activeGoals = await this.couchDbService.getConfiguredRoutine().then((val) => {
      return val;
    });
    if (this.activeGoals !== null) {
      this.setupTrackers();
    }
  }

  saveTrackedData() {
    this.couchDbService.logTrackedData(this.tracked);
    this.saved = true;
  }

  onDaySelect(componentEvent : {[eventPossibilities: string] : any}) {
    // console.log("##########");
    // console.log(componentEvent);
    this.dateSelected = componentEvent;
  }

  onClickTrackGoal(goal) {
    console.log(this.dataToTrack[goal]);
    // let customDataModal = this.modalCtrl.create(TrackingPage);
    // // customDataModal.onDidDismiss(() => {
    // //   this.loggedIn();
    // // });
    // customDataModal.present();
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
      neighborData[dt] = [nonEmptyDataTypes[i-1], nonEmptyDataTypes[i+1]];
    }

    let dataToSend = {"goal": goal,
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": neighborData};

    // this.navCtrl.setRoot(GoalModificationPage, dataToSend);
    this.navCtrl.setRoot(HomePage);
    this.navCtrl.push(TrackingPage, dataToSend);
  }

  addFirstGoal() {  // only if they don't have a goal setup yet
    this.navCtrl.push(GoalTypePage);
  }

  setupTrackers(){
    this.saved = true;
    if('dataToTrack' in this.activeGoals){
      this.previouslyTracked = this.couchDbService.getTrackedData(); // todo: only need to grab this month's
      this.quickTrackers = this.activeGoals.quickTrackers;

      if(this.quickTrackers && this.quickTrackers.length > 0){
        this.dataTypes = ['quickTracker'];
      }
      else{
        console.log("NO QUICK TRACKERS?!")
      }
      this.dataToTrack = Object.assign({}, this.activeGoals['dataToTrack']); // otherwise we modify it >.<
      this.dataTypes = this.dataTypes.concat(Object.keys(this.dataToTrack));
      this.dataToTrack["quickTracker"] = this.quickTrackers;

      this.calculateGoalProgresses();

    }
  }

  trackedMeds(){
    return this.globalFuns.getWhetherTrackedMeds(this.tracked);
  }

  changeVals(componentEvent : {[eventPossibilities: string] : any}, data : {[dataProps: string] : any},
              dataType: string){
    if(dataType === 'quickTracker') dataType = data.dataType; // SHOULD always work, given data config code ...
    // todo: schedule the notification if they say they had a migraine!
    if(componentEvent.dataVal){
      if(!this.tracked.hasOwnProperty(dataType)) this.tracked[dataType] = {};
      this.tracked[dataType][data.id] = componentEvent.dataVal;
    }
    if(componentEvent.dataStart){
      if(!this.durationItemStart[dataType]) this.durationItemStart[dataType] = {};
      this.durationItemStart[dataType][data.id] = componentEvent.dataStart;
    }
    if(componentEvent.dataEnd){
      if(!this.durationItemEnd[dataType]) this.durationItemEnd[dataType] = {};
      this.durationItemEnd[dataType][data.id] = componentEvent.dataEnd;
    }
    this.saved = false;

    console.log("!!!!!!!!!!!!!!");
    console.log(this.dataToTrack);
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
    if(timesTracked > data.goal.threshold){
      if(data.goal.freq === 'More'){
        return 'met';
      }
      return 'over'
    }
    else if(timesTracked === data.goal.threshold){
      if(data.goal.freq === 'More'){
        return 'met';
      }
      return 'at limit';
    }
    else{
      if(data.goal.freq === 'More'){
        return 'under';
      }
      return 'below limit';
    }
  }

  totalTrackedTimes(data: {[dataProps : string] : any}, dataType : string) : Number{
    if(dataType === 'quickTracker') dataType = data.dataType;
    let timesSoFar = this.goalProgresses[dataType] ? this.goalProgresses[dataType][data.id] : 0;
    if (data.id === 'frequentMedUse'){ // we pull from the 'treatments' dict!
      timesSoFar += (this.trackedMeds() ? 1 : 0);
    }
    else if(this.tracked[dataType] && this.tracked[dataType][data.id]) {
      if (data.field === 'number') {
        timesSoFar += Number(this.tracked[dataType][data.id]);
      }
      else if (data.field !== 'binary' || this.tracked[dataType][data.id] === 'Yes') {
        timesSoFar += 1;
      }
    }
    return timesSoFar;
  }

  calculateGoalProgresses() { // todo: rename, since we do the dataToTrack work here too...
    for(let i=0; i<this.dataTypes.length; i++){
      let dataType = this.dataTypes[i];
      if(dataType === 'quickTracker') continue;
      this.goalProgresses[dataType] = {};
      this.dataList[dataType] = this.dataToTrack[dataType].filter(function(x){
        if(!x.quickTrack) return x;
      }).map(x => x.name).join(", ");
      console.log(this.dataList[dataType]);
      for(let j=0; j<this.dataToTrack[dataType].length; j++){
        let data = this.dataToTrack[dataType][j];
        if(data.id === 'frequentMedUse'){
          this.goalProgresses[dataType][data.id] =
            this.globalFuns.calculatePriorGoalProgress(data, '', this.previouslyTracked);
        }
        else if(data.goal && data.goal.freq) {
          this.goalProgresses[dataType][data.id] =
            this.globalFuns.calculatePriorGoalProgress(data, dataType, this.previouslyTracked);
        }
      }
    }
  }
}
