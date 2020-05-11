// Reference: https://github.com/laker007/ionic3-calendar

import {Component, Output, EventEmitter, Input} from '@angular/core';
import * as moment from 'moment';
import * as _ from "lodash";

@Component({
    selector: 'ion-calendar',
    templateUrl: 'calendar.html'
})

export class Calendar {
    @Output() onDaySelect = new EventEmitter<dateObj>();
    @Input() isExpandCalendar: boolean;

    currentYear: number;
    currentMonth: number;
    currentDate: number;
    currentDay: number;
    displayYear: number;
    displayMonth: number;
    selectedDateText: string;
    selectedDate: any;

    dateArray: Array<dateObj> = []; // data for the current month
    weekArray = []; // weekly data (data per rows)
    lastSelect: number = 0; // last click
    weekHead: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    monthNames: string[] = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];

    constructor() {
        this.currentYear = moment().year();
        this.currentMonth = moment().month();
        this.currentDate = moment().date();
        this.currentDay = moment().day();
        this.isExpandCalendar = false;
        this.selectedDateText = (this.currentMonth + 1) + "/" + this.currentDate + "/" + this.currentYear.toString();
        this.selectedDate = {'isToday': true}
    }

    ngOnInit() {
        this.today()
    }

    // select today
    today() {
        this.displayYear = this.currentYear;
        this.displayMonth = this.currentMonth;
        this.createMonth(this.currentYear, this.currentMonth);

        // mark today as selected
        let todayIndex = _.findIndex(this.dateArray, {
            year: this.currentYear,
            month: this.currentMonth,
            date: this.currentDate,
            isThisMonth: true
        });
        this.lastSelect = todayIndex;
        this.dateArray[todayIndex].isSelect = true;

        this.onDaySelect.emit(this.dateArray[todayIndex]);
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

        if (this.currentYear === year && this.currentMonth === month) {
            let todayIndex = _.findIndex(this.dateArray, {
                year: this.currentYear,
                month: this.currentMonth,
                date: this.currentDate,
                isThisMonth: true
            });
            this.dateArray[todayIndex].isToday = true;
        }

        // add next month's data. either 5 or 6 weeks
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
                weekDays.push(this.dateArray[i * 7 + j]);
            }
            this.weekArray.push(weekDays);
            weekDays = [];
        }
    }

    back() {
        // deal with cross-year case
        if (this.displayMonth === 0) {
            this.displayYear--;
            this.displayMonth = 11;
        } else {
            this.displayMonth--;
        }
        this.createMonth(this.displayYear, this.displayMonth);
    }


    forward() {
        // deal with cross-year case
        if (this.displayMonth === 11) {
            this.displayYear++;
            this.displayMonth = 0;
        } else {
            this.displayMonth++;
        }
        this.createMonth(this.displayYear, this.displayMonth);
    }

    // select a day
    daySelect(day, i, j) {
        // first, dump previous data
        this.dateArray[this.lastSelect].isSelect = false;
        // save the selected day
        this.lastSelect = i * 7 + j;
        this.dateArray[i * 7 + j].isSelect = true;
        this.selectedDateText = day['month'] + "/" + day['date'] + "/" + day['year'].toString();
        this.selectedDate = day;

        this.onDaySelect.emit(day);
        // console.log("~~~~~~~~~");
        // console.log(day);
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
