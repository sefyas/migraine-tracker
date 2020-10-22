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
  currentBreak : any;
  selected : string = '';

  currentBreakStarted : string;
  dateToSnoozeTo : string = '';
  dateToCheckIn : string = '';
  reasonForBreak : string = '';

  displayBreakInfo : boolean = false;
  displayReasonInfo : boolean = false;
  displayReasonEditBtn : boolean = true;
  displayBreakEditBtn : boolean = true;
  displayCheckInEditBtn : boolean = true;

  today : string = moment().toISOString();
  nextYear : string = moment().add(1, "year").toISOString();
  monthNames: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  @ViewChild('breakDatePicker') breakDatePicker;
  @ViewChild('checkInDatePicker') checkInDatePicker;
  @ViewChild('updateBreakDatePicker') updateBreakDatePicker;
  @ViewChild('updateCheckInDatePicker') updateCheckInDatePicker;

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              public couchDBProvider: CouchDbServiceProvider,
              private dateFuns: DateFunctionServiceProvider) {
  }

  async ionViewDidLoad() {
    this.currentBreak = await this.couchDBProvider.fetchBreak();

    if (!this.currentBreak) {
      this.dateToCheckIn = moment().add(1, "month").toISOString();
    }
    if (this.currentBreak.started) {
      this.currentBreakStarted = this.dateFuns.dateToPrettyDate(this.currentBreak.started);
    }
    if (this.currentBreak.notifyDate) {
      this.dateToSnoozeTo = this.currentBreak.notifyDate;
    }
    if (this.currentBreak.checkInDate) {
      this.dateToCheckIn = this.currentBreak.checkInDate;
    }
    if (this.currentBreak.reasonForBreak) {
      this.reasonForBreak = this.currentBreak.reasonForBreak;
    }
  }

  updateBreakDate() {
    this.updateBreakDatePicker.open();
  }

  updateCheckInDate() {
    this.updateCheckInDatePicker.open();
  }

  editDateToCheckIn() {
    this.checkInDatePicker.open();
  }

  editDateToSnoozeTo() {
    this.breakDatePicker.open();
  }

  onEditBreakFocus() {
    this.displayBreakEditBtn = false;
  }

  onEditCheckInFocus() {
    this.displayCheckInEditBtn = false;
  }

  onEditBreakReasonFocus() {
    this.displayReasonEditBtn = false;
  }

  onEditBreakBlur() {
    this.displayBreakEditBtn = true;
    if (this.dateToSnoozeTo !== '') {
      this.dateToCheckIn = '';
    }
  }

  onEditCheckInBlur() {
    this.displayCheckInEditBtn = true;
    if (this.dateToCheckIn !== '') {
      this.dateToSnoozeTo = '';
    }
  }

  onEditBreakReasonBlur() {
    this.displayReasonEditBtn = true;
    this.updateBreak();
  }


  updateBreak() {
    if (this.currentBreakStarted) this.currentBreak['started'] = this.currentBreakStarted;
    if (this.dateToSnoozeTo !== '') {
      this.currentBreak['notifyDate'] = this.dateToSnoozeTo;
      delete this.currentBreak['checkInDate'];
    }
    if (this.dateToCheckIn !== '') {
      this.currentBreak['checkInDate'] = this.dateToCheckIn;
      delete this.currentBreak['notifyDate'];
    }
    if (this.reasonForBreak !== '') this.currentBreak['reasonForBreak'] = this.reasonForBreak;
    this.couchDBProvider.logBreak(this.currentBreak);
  }

  endBreak() {
    this.currentBreak['ended'] = new Date();
    this.couchDBProvider.logBreak(this.currentBreak, true);
    this.currentBreak = undefined;
    this.dateToSnoozeTo = '';
    this.dateToCheckIn = '';
    this.selected = '';
    this.reasonForBreak = undefined;
    this.currentBreakStarted = undefined;
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
  setSelected(val : string) {
    if (this.selected === val) {
      this.selected = '';
    } else {
      this.selected = val;
    }
    if (this.selected === "Yes") {

      this.breakDatePicker.open();
      this.dateToCheckIn = '';
    } else if (this.selected === "Unsure") {
      this.checkInDatePicker.open();
      this.dateToSnoozeTo = '';
    } else if (this.selected === '') {
      this.selected = '';
      this.dateToSnoozeTo = '';
      this.dateToCheckIn = '';
    }
  }

  onBreakDatePickerCancel() {
    this.dateToSnoozeTo = '';
    this.selected = '';
  }

  onCheckInDatePickerCancel() {
    this.dateToCheckIn = '';
    this.selected = '';
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
    let newBreak = {'started': new Date()};
    if (this.reasonForBreak !== '') newBreak['reasonForBreak'] = this.reasonForBreak;
    if (this.selected === 'Yes' && this.dateToSnoozeTo !== '') {
      newBreak['notifyDate'] = this.dateToSnoozeTo;
    } else if (this.selected ==='Unsure' && this.dateToCheckIn !== '') {
      newBreak['checkInDate'] = this.dateToCheckIn;
    }
    this.couchDBProvider.logBreak(newBreak);
    this.currentBreak = newBreak;
    this.currentBreakStarted = this.dateFuns.dateToPrettyDate(this.currentBreak.started);
  }
}
