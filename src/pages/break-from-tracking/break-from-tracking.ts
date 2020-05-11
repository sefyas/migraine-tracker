import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import * as moment from 'moment';
import { DateFunctionServiceProvider } from "../../providers/date-function-service/date-function-service";
import { Break } from "../../interfaces/customTypes";


/**
 * Generated class for the BreakFromTrackingPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-break-from-tracking',
  templateUrl: 'break-from-tracking.html',
})
export class BreakFromTrackingPage {

  private displayBreakInfo : boolean = false;
  private displayReasonInfo : boolean = false;
  private currentBreak : Break;
  private currentBreakStarted : string;
  private selected : string = '';
  private dateToSnoozeTo : string = '';
  private dateToCheckIn : string = '';
  private selectedDateToCheckIn : string = '';
  private reasonForBreak : string;
  private breakChanged : boolean = false;
  private today : string = moment().toISOString();
  private nextYear : string = moment().add(1, "year").toISOString();
  private breakSkip : boolean = false;
  // private checkInSkip : boolean = false;
  private displayReasonEditBtn : boolean = true;
  private displayBreakEditBtn : boolean = true;

  monthNames: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  @ViewChild('breakDatePicker') breakDatePicker;
  @ViewChild('reminderDatePicker') reminderDatePicker;
  @ViewChild('updateBreakDatePicker') updateBreakDatePicker;
  @ViewChild('scheduleBreakDatePicker') scheduleBreakDatePicker;

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              public couchDBProvider: CouchDbServiceProvider,
              private dateFuns: DateFunctionServiceProvider) {
    // this.currentBreak = this.couchDBProvider.getCurrentBreak();
    this.currentBreak = {
      // "started": "2019-02-27",
      // "ended": "2020-05-10",
      // "checkInDate": "2020-04-01",
      // "notifyDate" : "2020-05-10",
      // "reasonForBreak": "I am traveling to another country for a vacation."
    };

    if (!this.currentBreak){
      this.dateToCheckIn = moment().add(1, "month").toISOString();
    }
    if (this.currentBreak.started) {
      this.currentBreakStarted = this.dateFuns.dateToPrettyDate(this.currentBreak.started);
    }
    if (this.currentBreak.notifyDate) {
      this.dateToSnoozeTo = this.currentBreak.notifyDate;
    }
    if (this.currentBreak.checkInDate) {
      this.selected = "Unsure";
      this.selectedDateToCheckIn = this.currentBreak.checkInDate;
    }
  }

  ionViewDidLoad() {}

  scheduleBreakDate() {
    this.scheduleBreakDatePicker.open();
  }

  updateBreakDate() {
    this.updateBreakDatePicker.open();
  }

  onEditBreakReasonFocus() {
    this.displayReasonEditBtn = false;
  }

  onEditBreakReasonBlur() {
    this.displayReasonEditBtn = true;
    this.updateBreak();
  }

  onEditBreakFocus() {
    this.displayBreakEditBtn = false;
  }

  onEditBreakBlur() {
    this.displayBreakEditBtn = true;
    this.updateBreak();
  }

  editDateToCheckIn() {
    this.reminderDatePicker.open();
  }

  editDateToSnoozeTo() {
    this.breakDatePicker.open();
    this.breakSkip = false;
  }

  updateBreak(){
    this.currentBreak['notifyDate'] = this.dateToSnoozeTo;
    this.currentBreak['reasonForBreak'] = this.reasonForBreak;
    if(this.dateToSnoozeTo){
      delete this.currentBreak['checkInDate'];
    }
    else{
      this.currentBreak['checkInDate'] = this.dateToCheckIn;
    }
    this.breakChanged=false;
    this.couchDBProvider.updateBreak(this.currentBreak);
  }

  endBreak(){
    //todo: push to couch, deal with notifications, etc
    this.currentBreak['ended'] = new Date();
    this.couchDBProvider.updateBreak(this.currentBreak);
    this.currentBreak = undefined;
    this.dateToSnoozeTo = undefined;
    this.dateToCheckIn = undefined;
    this.selected = undefined;
    this.reasonForBreak = undefined;
    this.dateToCheckIn = moment().add(1, "month").toISOString();
  }


  // =========== Info Button Handling Start ===========
  onClickDisplayBreakInfo() {
    this.displayBreakInfo = true;
  }

  onClickDisplayReasonInfo() {
    this.displayReasonInfo = true;
  }

  onClickCloseInfo() {
    this.displayBreakInfo = false;
    this.displayReasonInfo = false;
  }
  // =========== Info Button Handling End ===========

  // =========== NOT current break ===========
  setSelected(val : string){
    if (this.selected === val) {
      this.selected = '';
    } else {
      this.selected = val;
    }
    if (this.selected === "Yes") {
      this.breakDatePicker.open();
      this.selectedDateToCheckIn = '';
      // this.checkInSkip = false;
    } else if (this.selected === "Unsure") {
      this.reminderDatePicker.open();
      this.dateToSnoozeTo = '';
      this.breakSkip = false;
    } else if (this.selected === '') {
      this.selected = '';
      this.dateToSnoozeTo = '';
      this.selectedDateToCheckIn = '';
      this.breakSkip = false;
      // this.checkInSkip = false;
    }
  }

  onBreakDatePickerCancel() {
    this.dateToSnoozeTo = '';
    this.breakSkip = true;
  }

  onReminderDatePickerCancel() {
    this.selectedDateToCheckIn = '';
    this.selected = '';
    // this.checkInSkip = true;
  }

  formatDateString(dateString, format="-") {
    var year, month, day;
    if (format === "-") {
      year = dateString.slice(0, 4);
      month = parseInt(dateString.slice(5, 7));
      day = dateString.slice(8, 10);
      return this.monthNames[month-1] + " " + day + ", " + year;
    } else if (format === "/") {
      month = parseInt(dateString.slice(0, 2));
      day = dateString.slice(3, 5);
      year = dateString.slice(6, 10);
      return this.monthNames[month-1] + " " + day + ", " + year;
    }
  }

  takeBreak() {
    //todo: push to couch, deal with notifications, etc
    let newBreak = {'started': new Date()};
    newBreak['reasonForBreak'] = this.reasonForBreak;
    if (this.selected==='Yes' && this.dateToSnoozeTo) {
      newBreak['notifyDate'] = this.dateToSnoozeTo;
    } else if (this.selected ==='Unsure' && this.dateToCheckIn) {
      newBreak['checkInDate'] = this.dateToCheckIn;
    }
    this.couchDBProvider.setBreak(newBreak);
    this.currentBreak = newBreak;
    this.currentBreakStarted = this.dateFuns.dateToPrettyDate(this.currentBreak.started);
  }

}
