import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
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

// @IonicPage()
@Component({
  selector: 'page-tracking',
  templateUrl: 'tracking.html',
})
export class TrackingPage {

  private dataToTrack : {[dataType : string] : DataElement[]} = {};
  private dateSelected : any;
  private goal : any;
  private neighborData: any;
  // private dataTypes : string[];

  private tracked : {[dataType : string] : any} = {};
  private goalProgresses : {[dataType : string] : any} = {};
  // private activeGoals : ConfiguredRoutine;
  // private quickTrackers : DataElement[] = [];
  // private tracked : {[dataType : string] : any} = {};
  // private goalProgresses : {[dataType : string] : any} = {};
  // private dataToTrack : {[dataType : string] : DataElement[]} = {};
  // private dataList : {[dataType : string] : string} = {};
  // private dataTypes : string[];
  // private previouslyTracked : {[dataType : string] : any}[];
  // private somethingTracked : boolean;
  private durationItemStart : {[dataType : string] : any} = {};
  private durationItemEnd : {[dataType : string] : any} ={};
  // private cardExpanded : {[dataType : string] : boolean} = {};
  private saved : boolean;
  // private dateSelected : any;

  monthNames : string[] = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              private couchDbService: CouchDbServiceProvider,
              private dataDetialsProvider: DataDetailsServiceProvider,
              private dateFunctionsProvider: DateFunctionServiceProvider,
              private globalFuns: GlobalFunctionsServiceProvider) {
    this.dataToTrack = navParams.get('dataToTrack');
    // this.dataTypes = navParams.get('dataTypes');
    this.dateSelected = navParams.get('dateSelected');
    this.goal = navParams.get('goal');
    this.neighborData = navParams.get('neighborData');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad TrackingPage');
    console.log(this.dateSelected);
    console.log(this.dataToTrack);
    console.log(this.goal)
  }

  // ================= BUTTONS Start =================
  onHomeClick() {
    this.navCtrl.popToRoot();
  }

  onPreviousClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][0],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {direction: "back"});
  }

  onNextClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][1],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {direction: "forward"});
  }
  // ================= BUTTONS Ends =================

  // ================= Goal Data Starts =================
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

  // calculateGoalProgresses() { // todo: rename, since we do the dataToTrack work here too...
  //   for(let i=0; i<this.dataTypes.length; i++){
  //     let dataType = this.dataTypes[i];
  //     if(dataType === 'quickTracker') continue;
  //     this.goalProgresses[dataType] = {};
  //     this.dataList[dataType] = this.dataToTrack[dataType].filter(function(x){
  //       if(!x.quickTrack) return x;
  //     }).map(x => x.name).join(", ");
  //     console.log(this.dataList[dataType]);
  //     for(let j=0; j<this.dataToTrack[dataType].length; j++){
  //       let data = this.dataToTrack[dataType][j];
  //       if(data.id === 'frequentMedUse'){
  //         this.goalProgresses[dataType][data.id] =
  //           this.globalFuns.calculatePriorGoalProgress(data, '', this.previouslyTracked);
  //       }
  //       else if(data.goal && data.goal.freq) {
  //         this.goalProgresses[dataType][data.id] =
  //           this.globalFuns.calculatePriorGoalProgress(data, dataType, this.previouslyTracked);
  //       }
  //     }
  //   }
  // }

    // ================= Goal Data Ends =================
}
