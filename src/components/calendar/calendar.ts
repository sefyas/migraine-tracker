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
    lastSelect: number = 0; // last click index
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
        this.displayDateText = (this.displayDate['month'] + 1) + "/" + this.displayDate['date'] + "/" + this.displayDate['year'];
        this.displayDate['isToday'] = this.isToday();
    }

    async initCalendar(dateSelected) {
        this.displayDate = {'date': dateSelected[0], 'month': dateSelected[1], 'year': dateSelected[2]};
        await this.createMonth(this.displayDate['year'], this.displayDate['month']);
        let selectedIndex = _.findIndex(this.dateArray, {
            year: this.displayDate['year'],
            month: this.displayDate['month'],
            date: this.displayDate['date'],
        });
        this.lastSelect = selectedIndex;
        this.dateArray[selectedIndex].isSelect = true;
    }

    isToday() {
        return this.displayDate['date'] === this.currentDate['date'] &&
            this.displayDate['month'] === this.currentDate['month'] &&
            this.displayDate['year'] === this.currentDate['year'];
    }

    async createMonth(year: number, month: number) {
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
                        year: year,
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
                        year: year,
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
                var trackingData = await this.getTrackingData(day);
                day['change'] = 'Change' in trackingData ? Object.keys(trackingData['Change']).length : 0;
                day['symptom'] = 'Symptom' in trackingData ? Object.keys(trackingData['Symptom']).length : 0;
                day['treatment'] = 'Treatment' in trackingData ? Object.keys(trackingData['Treatment']).length : 0;
                day['contributor'] = 'Contributor' in trackingData ? Object.keys(trackingData['Contributor']).length : 0;
                day['other'] = 'Other' in trackingData ? Object.keys(trackingData['Other']).length : 0;
                weekDays.push(day);
            }
            this.weekArray.push(weekDays);
            weekDays = [];
        }
    }

    async back() {
        // deal with cross-year case
        if (this.displayDate['month'] === 0) {
            this.displayDate['year']--;
            this.displayDate['month'] = 11;
        } else {
            this.displayDate['month']--;
        }
        await this.createMonth(this.displayDate['year'], this.displayDate['month']);
    }

    async forward() {
        // deal with cross-year case
        if (this.displayDate['month'] === 11) {
            this.displayDate['year']++;
            this.displayDate['month'] = 0;
        } else {
            this.displayDate['month']++;
        }
        await this.createMonth(this.displayDate['year'], this.displayDate['month']);
    }

    // select a day
    daySelect(day, i, j) {
        if (!((day['year'] === this.currentDate['year'] && day['month'] === this.currentDate['month'] &&
            day['date'] > this.currentDate['date']) || !day['isThisMonth'])) {
            this.dateArray[this.lastSelect].isSelect = false;
            this.lastSelect = i * 7 + j;
            this.dateArray[i * 7 + j].isSelect = true;
            this.displayDateText = (day['month'] + 1) + "/" + day['date'] + "/" + day['year'];
            this.displayDate = day;
            this.onDaySelect.emit([day['date'], day['month'], day['year']]);
        }
    }

    trackingDataExist(day, type) {
        var exist: boolean;

        switch(type){
            case 'change':
                exist = day['change'] > 0;
                break;
            case 'symptom':
                exist = day['symptom'] > 0;
                break;
            case 'treatment':
                exist = day['treatment'] > 0;
                break;
            case 'contributor':
                exist = day['contributor'] > 0;
                break;
            case 'other':
                exist = day['other'] > 0;
                break;
            default:
                exist = false;
        }

        /*
        switch(type){
            case 'change':
                exist = day['date'] % 6 === 0;
                break;
            case 'symptom':
                exist = day['date'] % 2 === 0;
                break;
            case 'treatment':
                exist = day['date'] % 3 === 0;
                break;
            case 'contributor':
                exist = day['date'] % 4 === 0;
                break;
            case 'other':
                exist = day['date'] % 5 === 0;
                break;
            default:
                exist = false;
        }

        if (day['date'] === 13){
            //var trackedData = this.getData([day['date'], day['month'], day['year']]);
            //console.log(trackedData);
            exist = true;
        }
        */

        return exist;
    }

    noDataExists(day){
        if (day['change'] > 0){
            return false;
        }

        if (day['symptom'] > 0){
            return false;
        }

        if (day['treatment'] > 0){
            return false;
        }

        if (day['contributor'] > 0){
            return false;
        }

        if (day['other'] > 0){
            return false;
        }

        return true;
    }

    async getTrackingData(day) {
        var date = [day['date'], day['month'], day['year']];
        var trackingData = await this.couchDBService.fetchTrackedData(date);
        return trackingData
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
