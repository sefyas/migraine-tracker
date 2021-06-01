// Reference: https://github.com/laker007/ionic3-calendar
// Author: Liwei Jiang

import {Component, Output, EventEmitter, Input} from '@angular/core';
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import * as moment from 'moment';
import * as _ from "lodash";

@Component({
    selector: 'ion-calendar',
    templateUrl: 'calendar.html'
})

export class Calendar {
    @Output() onDaySelect = new EventEmitter<any>();
    @Input() dateSelected: number[];

    displayDate : any = {};
    currentDate: any = {};
    displayDateText: string;
    dateArray: Array<dateObj> = []; // data for the current month
    weekArray = []; // weekly data (data per rows)
    lastSelect: number = 0; // last click index //YSS stopped using this because the index is out of date when navigating from one month to another
    isExpandCalendar: boolean;
    weekHead: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    monthNames: string[] = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];

    constructor(private couchDBService: CouchDbServiceProvider) {
        this.currentDate = {'date': moment().date(), 'month': moment().month(), 'year': moment().year()};
        this.isExpandCalendar = true;
    }

    ngOnInit() {
        this.initCalendar(this.dateSelected);
    }

    initCalendar(dateSelected) {
        //console.log('YSS Calendar - initCalendar: called');
        this.displayDate = {'date': dateSelected[0], 'month': dateSelected[1], 'year': dateSelected[2]};
        this.createMonth(this.displayDate['year'], this.displayDate['month']);
        this.setSelection();
        this.displayDate['isToday'] = this.isToday();
        //YSS NOTE 'isThisMonth' is not set for displayDate. It is alright mainly
        //          because displayDate.isThisMonth is never used elsewhere. 
        //          Otherwise it should have been taken care of.
    }

    setSelection(){
        this.displayDateText = (this.displayDate['month'] + 1) + "/" + this.displayDate['date'] + "/" + this.displayDate['year'];
        let ind = _.findIndex(this.dateArray, {
            year: this.displayDate['year'],
            month: this.displayDate['month'],
            date: this.displayDate['date'],
        });
        let last_ind = _.findIndex(this.dateArray, {
            year: this.dateSelected[2],
            month: this.dateSelected[1],
            date: this.dateSelected[0],
        });
        //console.log('YSS Calendar - setSelectedDate: index for selected date', this.displayDate, 'is', ind, ', index of last selected date', this.dateSelected, 'is', last_ind, ', lastSelect is', this.lastSelect, '. dateArray is', this.dateArray);
        //console.log('YSS Calendar - setSelectedDate: isSelect status in dateArray; ind', ind !== -1 ? this.dateArray[ind].isSelect: 'undefined', 'last_ind', last_ind !== -1 ? this.dateArray[last_ind].isSelect: 'undefined', 'lastSelect', this.dateArray[this.lastSelect].isSelect)
        if (ind !== -1) {
            this.dateArray[ind].isSelect = true;
        }
        if (last_ind !== -1) {
            this.dateArray[last_ind].isSelect = false;
        }
        return ind;
    }

    isToday() {
        return this.displayDate['date'] === this.currentDate['date'] &&
            this.displayDate['month'] === this.currentDate['month'] &&
            this.displayDate['year'] === this.currentDate['year'];
    }

    createMonth(year: number, month: number) {
        this.dateArray = []; // dump last month's data
        this.weekArray = []; // dump data
        let firstDay; // first day of this current month
        let preMonthDays; // number of days of the last month
        let monthDays; // number of day of the current month
        let weekDays: Array<dateObj> = [];

        firstDay = moment({ year: year, month: month, date: 1 }).day();
        // the number of days last month
        if (month === 0) {
            preMonthDays = moment({ year: year - 1, month: 11 }).daysInMonth();
        } else {
            preMonthDays = moment({ year: year, month: month - 1 }).daysInMonth();
        }
        // the number of days this month
        monthDays = moment({ year: year, month: month }).daysInMonth();

        // add the last few days from last month to the calendar
        if (firstDay !== 7) { // don't display last month if the first day of the month is Sunday
            let lastMonthStart = preMonthDays - firstDay + 1; // remaining days from last month
            for (let i = 0; i < firstDay; i++) {
                if (month === 0) {
                    this.dateArray.push({
                        year: year, //YSS why not year: year-1?
                        month: 11,
                        date: lastMonthStart + i,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                    })
                } else {
                    this.dateArray.push({
                        year: year,
                        month: month - 1,
                        date: lastMonthStart + i,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                    })
                }
            }
        }

        // add this month's data
        for (let i = 0; i < monthDays; i++) {
            this.dateArray.push({
                year: year,
                month: month,
                date: i + 1,
                isThisMonth: true,
                isToday: false,
                isSelect: false,
            })
        }

        if (this.currentDate['year'] === year && this.currentDate['month'] === month) {
            let todayIndex = _.findIndex(this.dateArray, {
                year: this.currentDate['year'],
                month: this.currentDate['month'],
                date: this.currentDate['date'],
                isThisMonth: true
            });
            this.dateArray[todayIndex].isToday = true;
        }

        // add next month's data. either 5 or 6 weekss
        if (this.dateArray.length % 7 !== 0) {
            let nextMonthAdd = 7 - this.dateArray.length % 7
            for (let i = 0; i < nextMonthAdd; i++) {
                if (month === 11) {
                    this.dateArray.push({
                        year: year, //YSS why not year: year+1
                        month: 0,
                        date: i + 1,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                    })
                } else {
                    this.dateArray.push({
                        year: year,
                        month: month + 1,
                        date: i + 1,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                    })
                }

            }
        }
        // all date data are added to the dateArray

        // add the dates as groups of 7 days to the weekArray
        for (let i = 0; i < this.dateArray.length / 7; i++) {
            for (let j = 0; j < 7; j++) {
                var day = this.dateArray[i * 7 + j];
                day['changeReported'] = -1;
                day['symptomReported'] = -1;
                day['treatmentReported'] = -1;
                day['contributorReported'] = -1;
                day['otherReported'] = -1;
                day['symptomExists'] = false;
                weekDays.push(day);
            }
            this.weekArray.push(weekDays);
            weekDays = [];
        }

        // get tracking data for each date
        // NOTE it is important to first create weekArray then update it based on data availability;
        //      otherwise, there is a change that we do not access what we intend (we unlikely though).
        //      Therefore the code below is not within the loop above but after it.
        for (let i = 0; i < this.weekArray.length; i++) {
            for (let j = 0; j < this.weekArray[i].length; j++) {
                this.getTrackingData(this.weekArray[i][j]).then((trackingDataDoc) => {
                    var info = trackingDataDoc['tracked_data_field'];
                    var data = trackingDataDoc['tracked_data'];
                    this.weekArray[i][j]['changeReported'] = 'Change' in data ? Object.keys(data['Change']).length : 0;
                    this.weekArray[i][j]['symptomReported'] = 'Symptom' in data ? Object.keys(data['Symptom']).length : 0;
                    this.weekArray[i][j]['treatmentReported'] = 'Treatment' in data ? Object.keys(data['Treatment']).length : 0;
                    this.weekArray[i][j]['contributorReported'] = 'Contributor' in data ? Object.keys(data['Contributor']).length : 0;
                    this.weekArray[i][j]['otherReported'] = 'Other' in data ? Object.keys(data['Other']).length : 0;
                    this.weekArray[i][j]['symptomExists'] = 'Symptom' in data ? this.symptomsExist(data['Symptom'], info['Symptom']): false;
                    //this.weekArray[i][j]['symptomExists'] = this.weekArray[i][j]['date'] % 6 === 0 ;
                });             
            }
        }

        //console.log('YSS Calendar - createMonths: dateArray', this.dateArray, 'weekArray', this.weekArray, 'dateSelected', this.dateSelected);
    }

    back() {
        // deal with cross-year case
        if (this.displayDate['month'] === 0) {
            this.displayDate['year']--;
            this.displayDate['month'] = 11;
        } else {
            this.displayDate['month']--;
        }
        this.displayDate['date'] = moment({year: this.displayDate['year'], 
                                           month: this.displayDate['month']}).daysInMonth();
        if (this.currentDate['year'] === this.displayDate['year'] && 
            this.currentDate['month'] === this.displayDate['month'] &&
            this.currentDate['date'] === this.displayDate['date']) {
            this.displayDate.isToday = true;
        } else {
            this.displayDate.isToday = false;
        }
        this.createMonth(this.displayDate['year'], this.displayDate['month']);
        this.setSelection();
        this.onDaySelect.emit([this.displayDate['date'], this.displayDate['month'], this.displayDate['year']]);
        //console.log('YSS Calendar - back: displayDate', this.displayDate)
    }

    forward() {
        // deal with cross-year case
        if (this.displayDate['month'] === 11) {
            this.displayDate['year']++;
            this.displayDate['month'] = 0;
        } else {
            this.displayDate['month']++;
        }
        this.displayDate['date'] = 1;
        if (this.currentDate['year'] === this.displayDate['year'] && 
            this.currentDate['month'] === this.displayDate['month'] &&
            this.currentDate['date'] === this.displayDate['date']) {
            this.displayDate.isToday = true;
        } else {
            this.displayDate.isToday = false;
        }
        this.createMonth(this.displayDate['year'], this.displayDate['month']);
        this.setSelection();
        this.onDaySelect.emit([this.displayDate['date'], this.displayDate['month'], this.displayDate['year']]);
        //console.log('YSS Calendar - forward: displayDate', this.displayDate)
    }

    // select a day
    daySelect(day, i, j) {
        if (!(    (   day['year'] === this.currentDate['year'] 
                   && day['month'] === this.currentDate['month'] 
                   && day['date'] > this.currentDate['date'])
               || !day['isThisMonth'])) { //YSS if not today but within this month
            this.displayDate = day;
            this.setSelection();
            this.onDaySelect.emit([this.displayDate['date'], this.displayDate['month'], this.displayDate['year']]);
            //console.log('YSS Calendar - daySelect: dateSelect is', this.dateSelected); //YSS this.dateSelected is not day!
        }
    }

    symptomsExist(data, info) {
        var exist: boolean = false;
        //console.log("YSS in symptomsExist data is", data, "with info", info);
        for(const item in data){
            // YSS TO-DO this is to handle cases where entries are created without any 
            //           values associted with them. As soon the entries are only created
            //           if they have values, this check can be removed.
            if(data[item] === null) {
                console.log("YSS item", item, "value is undefined.");
                continue;
            }

            if(info[item] === 'binary' && data[item] === 'Yes'){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            if(info[item] === 'number' && parseInt(data[item]) > 0){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            if(info[item] === 'numeric scale' && data[item] > 0){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            if(info[item] === 'category scale' && data[item] !== 'None'){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            // YSS TO-DO the second condition is meant to handle the current issue that 
            //           does not allow clearing text boxes. It can be removed as soon as
            //           that issue is resolved.
            // YSS TO-DO we can consider more sophisticated content analysis to decide if
            //           text indicates presence of symptoms.
            if(info[item] === 'note' && data[item].length > 1){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            if(info[item] === 'time'){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }

            if(info[item] === 'time range'){
                //console.log("YSS item", item, "of type", info[item], "and value", data[item], "indicates presence of symptoms");
                exist = true;
                break;
            }
        }
        return exist;
    }

    trackingDataReported(day, type) {
        var reported: boolean;

        /**/
        switch(type){
            case 'change':
                reported = day['changeReported'] > 0;
                break;
            case 'symptom':
                reported = day['symptomReported'] > 0;
                break;
            case 'treatment':
                reported = day['treatmentReported'] > 0;
                break;
            case 'contributor':
                reported = day['contributorReported'] > 0;
                break;
            case 'other':
                reported = day['otherReported'] > 0;
                break;
            default:
                reported = false;
        }

        /* 
        switch(type){
            case 'change':
                reported = day['date'] % 6 === 0;
                break;
            case 'symptom':
                reported = day['date'] % 2 === 0;
                break;
            case 'treatment':
                reported = day['date'] % 3 === 0;
                break;
            case 'contributor':
                reported = day['date'] % 4 === 0;
                break;
            case 'other':
                reported = day['date'] % 5 === 0;
                break;
            default:
                reported = false;
        }

        if (day['date'] === 13){
            //var trackedData = this.getData([day['date'], day['month'], day['year']]);
            //console.log(trackedData);
            reported = true;
        }
        */ 

        return reported;
    }

    noDataReported(day){
        if (day['changeReported'] > 0){
            return false;
        }

        if (day['symptomReported'] > 0){
            return false;
        }

        if (day['treatmentReported'] > 0){
            return false;
        }

        if (day['contributorReported'] > 0){
            return false;
        }

        if (day['otherReported'] > 0){
            return false;
        }

        /*
        if (day['date'] % 2 === 0) {
            return false
        }

        if (day['date'] % 3 === 0) {
            return false
        }

        if (day['date'] % 5 === 0) {
            return false
        }

        if (day['date'] === 13){
            return false;
        }
        */

        return true;
    }

    async getTrackingData(day) {
        var date = [day['date'], day['month'], day['year']];
        var trackingDataDoc = await this.couchDBService.fetchTrackedData(date);
        return trackingDataDoc
    }

    expandCalendar() {
        this.isExpandCalendar = !this.isExpandCalendar;
    }
}

// grid on the calendar
interface dateObj {
    year: number,
    month: number,
    date: number,
    isThisMonth: boolean,
    isToday?: boolean,
    isSelect?: boolean,
}
