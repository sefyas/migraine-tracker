import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {GlobalFunctionsServiceProvider} from "../global-functions-service/global-functions-service";


@Injectable()
export class CouchDbServiceProvider {

  private baseUrl : string = 'https://tractdb.org/api';
  private activeUserGoals : {[goalAspect:string]: any;} = {}; // only ONE entry is active at a given time; "goals" lists all current goals
  private trackedData : {[trackedData:string]: any;}[] = [];
  private options : {[optionName:string]: any;} = {withCredentials: true};

  constructor(public http: HttpClient, private globalFunctions: GlobalFunctionsServiceProvider) {
  }

  getCurrentBreak() : {[breakDetails: string] : any}{
    // todo: pull from db, make sure it's current
    return null;
    // return {
    //   "reasonForBreak": "I want to",
    //   "notifyDate": "2020-02-28",
    //   "started": "2019-02-27T01:07:42.495Z"
    // }
  }

  updateBreak(currentBreak : {[breakDetails: string] : any}){
    // todo: push to db
    console.log(currentBreak);
  }

  setBreak(newBreak : {[breakDetails: string] : any}){
    //todo: push to db
    console.log(newBreak);
  }


  login(credentials : {[login: string] : string}) {
    // log the user in based on the credentials
    return this.http.post(this.baseUrl + '/login', JSON.stringify(credentials), this.options);
  }

  userLoggedIn() {
    // see if we're logged in; response gives account
    return this.http.get(this.baseUrl + '/authenticated', this.options);
  }

  getQuickTrackers() : {[dataType: string] : any}{
    // todo: database, of course
    let defaultTrackers = {
      "Symptoms": [
        {
          "name": "Migraine today",
          "explanation": "Whether you had a migraine.",
          "fieldDescription": "Whether you had a migraine (yes/no)",
          "field": "binary",
          "goal": {
            "freq": "Less",
            "threshold": 1,
            "timespan": "Week"
          }
        }
      ],
      "Treatments": [
        {
          "name": "As-needed medications today",
          "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: advil, excedrin, tylenol, prescription medications you don't take daily.",
          "fieldDescription": "Whether you took any as-needed medication today",
          "field": "binary",
          "goal": {
            "freq": "Less",
            "threshold": 2,
            "timespan": "Week"
          },
        }
      ]
    };
    let quickTrackers = defaultTrackers;
    return quickTrackers;
  }


  trackData(newData : {[dataType: string] : any}) {
    // todo: should store a datapoint in couch as a new object
    // console.log(newData); // push to db
    // todo: needs to append start and end time!!!
    this.trackedData.push(newData);
    console.log(this.trackedData);
  }



  combineDataToTrack(oldDataToTrack : {[dataType:string]: any;},
                     newDataToTrack : {[dataType:string]: any;}) : {[dataType:string]: any;}{
    // should return all data to track
    if(newDataToTrack) {
      // @ts-ignore
      for (const [dataType, newData] of Object.entries(newDataToTrack)) {
        if (dataType in oldDataToTrack) {
          oldDataToTrack[dataType] = oldDataToTrack[dataType].concat(newData)
        } else {
          oldDataToTrack[dataType] = newData;
        }
      }
    }
    console.log(oldDataToTrack);
    return oldDataToTrack;
  }

  addGoalFromSetup(setupDict : {[configInfo: string] : any}) : {[goalsProps:string]: any;}{
    // todo: actually push to database
    let newGoals = setupDict['goalIDs'];
    if('goals' in this.activeUserGoals) { // we're appending goals
      this.activeUserGoals['deactivated'] = new Date(); // todo: push
      let goalSet = new Set(newGoals.concat(this.activeUserGoals['goals']));
      this.activeUserGoals = {'goals': Array.from(goalSet),
                      'dataToTrack':
                        this.combineDataToTrack(this.activeUserGoals['dataToTrack'], setupDict['selectedData']),
                      'textGoals': this.activeUserGoals['textGoals'] + "; " + setupDict['textGoals'],
                      'dateAdded': new Date(),
                      'notifications': setupDict.notificationSettings ?
                                          setupDict.notificationSettings : this.activeUserGoals['notifications']};
    }
    else{
      this.activeUserGoals = {'goals': newGoals,
                              'dataToTrack': setupDict.selectedData,
                              'textGoals': [setupDict.textGoals],
                              'dateAdded': new Date(),
                              'notifications': setupDict.notificationSettings};
    }
    console.log(this.activeUserGoals);
    return this.activeUserGoals;
  }

  modifyTrackingRoutine(dataType, newRoutine){
    // todo: push!  And maybe change date added??
    this.activeUserGoals.dataToTrack[dataType] = newRoutine;
  }

  modifyFrequency(newNotifications){
    // todo: push!  And maybe change date added??
    this.activeUserGoals.notifications = newNotifications;
  }

  modifyGoals(newGoalsObject){
    // todo: push!  And maybe change date added??
    this.activeUserGoals.goals = newGoalsObject['goalIDs'];
    this.activeUserGoals.textGoals = newGoalsObject['textGoals'];
  }

  removeGoal(goal : string) { //todo: dunno if we need this
    // todo: push to database
    if(goal === 'textGoal'){
      this.activeUserGoals['textGoals'] = undefined;
    }
    else{
      // TODO: nope; we want to make a copy and make the old one the active one
      this.activeUserGoals['goals'].splice(this.activeUserGoals['goals'].indexOf(goal), 1);
    }
  }

  editTextGoal(newGoal : string){ // todo: again, dunno if needed
    // todo: push to database
    this.activeUserGoals['textGoals'] = newGoal;
  }


  getActiveGoals() : {[goalAspect:string]: any}{
    if(Object.keys(this.activeUserGoals).length > 0){
      return this.activeUserGoals;
    }
    return this.getExampleGoal(); //todo: remove, use db
   // return {};
  }


  getTrackedData() : {[trackedData:string]: any;}[]{
    // todo!
    console.log(this.trackedData);
    if(this.trackedData.length > 0){
      return this.trackedData;
    }
    else{
      return this.getExamplePreviouslyTracked();
      // return [];
    }
  }


  getExamplePreviouslyTracked() : {[trackedData:string]: any;}[] {
    return [
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "17:39",
          "exerciseToday": 2,
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "01:22",
            "end": "16:49"
          },
          "peakMigraineSeverity": 5,
          "migraineStartTime": "04:13",
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-03-14T00:00:00.000Z",
        "endTime": "2019-03-15T00:00:00.000Z",
        "Changes": {
          "sleepToday": 13
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "03:32",
          "exerciseToday": 16
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "00:25",
            "end": "17:33"
          },
          "migraineStartTime": "12:11",
          "migraineToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-04-27T00:00:00.000Z",
        "endTime": "2019-04-28T00:00:00.000Z",
        "Changes": {
          "sleepToday": 0
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "17:19",
          "nutritionToday": "No",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "14:51",
            "end": "22:56"
          },
          "peakMigraineSeverity": 5,
          "migraineStartTime": "13:07",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-01-17T00:00:00.000Z",
        "endTime": "2019-01-18T00:00:00.000Z",
        "Changes": {
          "sleepToday": 1
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "00:13",
          "exerciseToday": 7,
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "04:21",
            "end": "19:46"
          },
          "peakMigraineSeverity": 7,
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-02-08T00:00:00.000Z",
        "endTime": "2019-02-09T00:00:00.000Z",
        "Changes": {
          "sleepToday": 11
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "23:49",
          "exerciseToday": 5,
          "nutritionToday": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "00:34",
            "end": "11:39"
          },
          "migraineStartTime": "23:57",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-03-17T00:00:00.000Z",
        "endTime": "2019-03-18T00:00:00.000Z",
        "Changes": {
          "sleepToday": 13
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "16:05",
          "exerciseToday": 9,
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "peakMigraineSeverity": 5,
          "migraineStartTime": "13:46",
          "migraineToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-04-25T00:00:00.000Z",
        "endTime": "2019-04-26T00:00:00.000Z",
        "Changes": {
          "sleepToday": 16
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "06:13",
          "exerciseToday": 17,
          "nutritionToday": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "08:30",
            "end": "15:30"
          },
          "peakMigraineSeverity": 4,
          "migraineToday": "Yes",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-01-20T00:00:00.000Z",
        "endTime": "2019-01-21T00:00:00.000Z",
        "Changes": {
          "sleepToday": 0
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "06:05",
          "exerciseToday": 4,
          "nutritionToday": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "16:10",
            "end": "16:31"
          },
          "migraineStartTime": "21:44",
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-01-04T00:00:00.000Z",
        "endTime": "2019-01-05T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "02:43"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "10:01",
            "end": "21:34"
          },
          "peakMigraineSeverity": 7,
          "migraineStartTime": "18:06",
          "migraineToday": "No"
        },
        "Other": {},
        "startTime": "2019-01-14T00:00:00.000Z",
        "endTime": "2019-01-15T00:00:00.000Z",
        "Changes": {
          "sleepToday": 9
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "00:49",
          "exerciseToday": 7,
          "nutritionToday": "No",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "18:01",
            "end": "21:31"
          },
          "peakMigraineSeverity": 5,
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-03-07T00:00:00.000Z",
        "endTime": "2019-03-08T00:00:00.000Z",
        "Changes": {
          "sleepToday": 18
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "13:57",
          "exerciseToday": 13,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "02:31",
            "end": "16:36"
          },
          "migraineStartTime": "09:48",
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-04-09T00:00:00.000Z",
        "endTime": "2019-04-10T00:00:00.000Z",
        "Changes": {
          "sleepToday": 5
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatments": {
          "exerciseToday": 7,
          "nutritionToday": "Yes"
        },
        "Symptoms": {
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-04-24T00:00:00.000Z",
        "endTime": "2019-04-25T00:00:00.000Z",
        "Changes": {
          "sleepToday": 0
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "migraineStartTime": "01:15"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-02-03T00:00:00.000Z",
        "endTime": "2019-02-04T00:00:00.000Z",
        "Changes": {
          "sleepToday": 4
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "08:19",
          "exerciseToday": 16,
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "19:17",
            "end": "20:59"
          },
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-02-13T00:00:00.000Z",
        "endTime": "2019-02-14T00:00:00.000Z",
        "Changes": {
          "sleepToday": 0
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "03:35",
          "exerciseToday": 2,
          "nutritionToday": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "13:56",
            "end": "20:57"
          },
          "peakMigraineSeverity": 5,
          "migraineStartTime": "11:24",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-04-15T00:00:00.000Z",
        "endTime": "2019-04-16T00:00:00.000Z",
        "Changes": {
          "sleepToday": 15
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "05:55",
          "exerciseToday": 12,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "peakMigraineSeverity": 5,
          "migraineStartTime": "05:48",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-04-07T00:00:00.000Z",
        "endTime": "2019-04-08T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "nutritionToday": "Yes",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "peakMigraineSeverity": 8,
          "migraineStartTime": "01:06",
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-01-05T00:00:00.000Z",
        "endTime": "2019-01-06T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "exerciseToday": 14,
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "05:29",
            "end": "11:38"
          },
          "migraineStartTime": "09:12",
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-03-22T00:00:00.000Z",
        "endTime": "2019-03-23T00:00:00.000Z",
        "Changes": {
          "sleepToday": 16
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "12:27",
          "exerciseToday": 15,
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "06:22",
            "end": "06:34"
          },
          "peakMigraineSeverity": 2,
          "migraineStartTime": "21:34",
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-01-04T00:00:00.000Z",
        "endTime": "2019-01-05T00:00:00.000Z",
        "Changes": {
          "sleepToday": 7
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "06:58"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "00:40",
            "end": "08:47"
          },
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-02-23T00:00:00.000Z",
        "endTime": "2019-02-24T00:00:00.000Z",
        "Changes": {
          "sleepToday": 9
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "11:39",
          "exerciseToday": 7,
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "22:29",
            "end": "22:29"
          },
          "migraineStartTime": "03:52",
          "migraineToday": "No",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-04-20T00:00:00.000Z",
        "endTime": "2019-04-21T00:00:00.000Z",
        "Changes": {
          "sleepToday": 18
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "08:35",
          "exerciseToday": 11,
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "12:21",
            "end": "12:46"
          },
          "peakMigraineSeverity": 2,
          "migraineStartTime": "17:32",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-04-05T00:00:00.000Z",
        "endTime": "2019-04-06T00:00:00.000Z",
        "Changes": {
          "sleepToday": 3
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatments": {
          "exerciseToday": 16,
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "07:26",
            "end": "22:32"
          },
          "peakMigraineSeverity": 8,
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-01-27T00:00:00.000Z",
        "endTime": "2019-01-28T00:00:00.000Z",
        "Changes": {
          "sleepToday": 3
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "20:29",
          "exerciseToday": 4,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "04:37",
            "end": "22:51"
          },
          "migraineStartTime": "14:13",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-03-22T00:00:00.000Z",
        "endTime": "2019-03-23T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "11:48",
          "exerciseToday": 13,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "02:59",
            "end": "14:59"
          },
          "peakMigraineSeverity": 5,
          "migraineToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-04-11T00:00:00.000Z",
        "endTime": "2019-04-12T00:00:00.000Z",
        "Changes": {
          "sleepToday": 12
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "07:40",
            "end": "21:54"
          },
          "migraineStartTime": "21:53",
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-03-03T00:00:00.000Z",
        "endTime": "2019-03-04T00:00:00.000Z",
        "Changes": {
          "sleepToday": 15
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "04:12",
          "exerciseToday": 14,
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "11:29",
            "end": "13:34"
          },
          "peakMigraineSeverity": 7,
          "migraineStartTime": "00:36",
          "migraineToday": "Yes",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-03-13T00:00:00.000Z",
        "endTime": "2019-03-14T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "11:17",
          "exerciseToday": 15,
          "nutritionToday": "No",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "23:45",
            "end": "23:46"
          },
          "migraineToday": "Yes"
        },
        "Other": {
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-01-12T00:00:00.000Z",
        "endTime": "2019-01-13T00:00:00.000Z",
        "Changes": {
          "sleepToday": 10
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "12:17",
          "nutritionToday": "Yes",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "18:29",
            "end": "20:41"
          },
          "migraineStartTime": "08:20",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-03-04T00:00:00.000Z",
        "endTime": "2019-03-05T00:00:00.000Z",
        "Changes": {
          "sleepToday": 8
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "12:47",
          "exerciseToday": 0,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "03:28",
            "end": "13:59"
          },
          "peakMigraineSeverity": 2,
          "migraineStartTime": "22:38",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-02-07T00:00:00.000Z",
        "endTime": "2019-02-08T00:00:00.000Z",
        "Changes": {
          "sleepToday": 8
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "stressToday": "Some"
        },
        "Treatments": {
          "exerciseToday": 4,
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "00:00",
            "end": "22:13"
          },
          "peakMigraineSeverity": 10,
          "migraineStartTime": "17:22",
          "migraineToday": "Yes",
          "headacheToday": "Yes"
        },
        "Other": {
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-04-18T00:00:00.000Z",
        "endTime": "2019-04-19T00:00:00.000Z",
        "Changes": {
          "sleepToday": 10
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "10:38",
          "nutritionToday": "Yes",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "22:39",
            "end": "22:49"
          },
          "migraineStartTime": "19:39",
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-02-16T00:00:00.000Z",
        "endTime": "2019-02-17T00:00:00.000Z",
        "Changes": {}
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatments": {
          "custom_timetookadvil": "11:27",
          "asNeededMeds": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "02:21",
            "end": "02:43"
          },
          "peakMigraineSeverity": 1,
          "migraineToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-02-20T00:00:00.000Z",
        "endTime": "2019-02-21T00:00:00.000Z",
        "Changes": {
          "sleepToday": 16
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatments": {
          "custom_timetookadvil": "00:17",
          "exerciseToday": 9,
          "nutritionToday": "Yes",
          "asNeededMeds": "Yes"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "16:55",
            "end": "18:56"
          },
          "peakMigraineSeverity": 9,
          "migraineStartTime": "07:53",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-03-07T00:00:00.000Z",
        "endTime": "2019-03-08T00:00:00.000Z",
        "Changes": {
          "sleepToday": 8
        }
      },
      {
        "allDay": "true",
        "Contributors": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatments": {
          "custom_timetookadvil": "12:39",
          "exerciseToday": 3,
          "nutritionToday": "No"
        },
        "Symptoms": {
          "custom_migraineduration": {
            "start": "12:50",
            "end": "17:51"
          },
          "peakMigraineSeverity": 10,
          "migraineStartTime": "08:02",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-03-22T00:00:00.000Z",
        "endTime": "2019-03-23T00:00:00.000Z",
        "Changes": {
          "sleepToday": 0
        }
      }
    ]
  }


  getExampleGoal()  : {[goalAspect:string]: any;}{
    let exGoal = {
        "goals": [
          "1",
          "2",
          "3",
          "1a",
          "1b",
          "1c",
          "3a",
          "3b"
        ],
        "dataToTrack": {
          "Change": [
            {
              "name": "Increasing Sleep",
              "id": "sleepChange",
              "explanation": "How much sleep you got today",
              "fieldDescription": "Hours of sleep",
              "field": "number",
              "goal": {
                "freq": "More",
                "threshold": 8,
                "timespan": "Day"
              },
              "recommendingGoals": [
                "1c"
              ],
              "startDate": "2019-04-11T16:22:17.264Z",
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            }
          ],
          "Symptom": [
            {
              "name": "Migraine today",
              "id": "migraineToday",
              "explanation": "Migraine experienced today",
              "fieldDescription": "Whether you had a migraine (yes/no)",
              "field": "binary",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2",
                "3a",
                "3b",
                "3c"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Quality of the Pain",
              "id": "painQuality",
              "explanation": "What the pain was like (pulsating/throbbing, pressure, tension, stabbing, sharp, dull, burning, other)",
              "fieldDescription": "Text box where you can describe the pain",
              "field": "note",
              "recommendingGoals": [
                "3b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Start time",
              "id": "migraineStartTime",
              "explanation": "The time your migraine started",
              "fieldDescription": "time",
              "field": "time",
              "recommendingGoals": [],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Migraine duration",
              "field": "time range",
              "id": "custom_migraineduration",
              "custom": true
            }
          ],
          "Treatment": [
            {
              "name": "As-needed medications today",
              "id": "asNeededMeds",
              "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: Advil, Excedrin, Tylenol, prescription medications you don't take regularly.",
              "fieldDescription": "Whether you took any as-needed medication today",
              "field": "binary",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2",
                "3a",
                "3b",
                "3c"
              ],
              "goal": {
                "freq": "Less",
                "threshold": 4,
                "timespan": "Month"
              },
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Exercise",
              "id": "exerciseToday",
              "explanation": "How much you exercised today",
              "fieldDescription": "Number of minutes of exercise",
              "field": "number",
              "goal": {
                "freq": "More",
                "threshold": 180,
                "timespan": "Week"
              },
              "recommendingGoals": [
                "1b",
                "3b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Nutrition Today",
              "id": "nutritionToday",
              "explanation": "Whether you ate healthily today. For example, we recommend 4-5 servings of veggies, eating regular meals, avoiding sugar",
              "fieldDescription": "Whether you ate healthily (yes/no)",
              "field": "binary",
              "recommendingGoals": [
                "1b",
                "3b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Time took advil",
              "field": "time",
              "id": "custom_timetookadvil",
              "custom": true
            }
          ],
          "Contributor": [
            {
              "name": "Stress",
              "id": "stressToday",
              "explanation": "How stressed you were today",
              "fieldDescription": "3-point stress rating",
              "significance": "High stress levels can lead to more migraines",
              "field": "category scale",
              "recommendingGoals": [
                "1b",
                "3b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Frequent Use of Medications",
              "id": "frequentMedUse",
              "explanation": "Calculated medication use, to let you know if you might want to think about cutting back.",
              "fieldDescription": "Number of pills you took",
              "field": "calculated medication use",
              "condition": true,
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2",
                "3a",
                "3b",
                "3c"
              ],
              "goal": {
                "freq": "Less",
                "threshold": 4,
                "timespan": "Month"
              },
              "significance": "If you use as-needed medications too frequently, they can start causing more migraines.",
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Alcohol",
              "id": "alcoholToday",
              "explanation": "How much alcohol you had today",
              "fieldDescription": "3-point alcohol rating",
              "field": "category scale",
              "recommendingGoals": [
                "1b",
                "3b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            }
          ],
          "Other": [
            {
              "name": "Other notes",
              "id": "otherNotes",
              "explanation": "Anything else you want to note about today ",
              "fieldDescription": "Text box where you can record any notes",
              "field": "note",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2",
                "3a",
                "3b",
                "3c"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            }
          ]
        },
        "textGoals": [
          "Get <1 migraine per week"
        ],
        "dateAdded": "2019-04-11T16:22:17.264Z",
        "notificationSettings": {
          "retroactive": {
            "delayScale": "Day",
            "delayNum": 1
          }
        },
      };
    this.activeUserGoals = exGoal;
    return exGoal;
  }






}
