import PouchDB from 'pouchdb';
import PouchDBAuthentication from 'pouchdb-authentication';
import { Injectable } from '@angular/core';
import { ConfiguredRoutine, DataElement, Notification } from "../../interfaces/customTypes";
import { DataReport } from "../../interfaces/customTypes";
import { Break } from "../../interfaces/customTypes";

let options = {
  live: true,
  retry: true,
  continuous: true
};


@Injectable()
export class CouchDbServiceProvider {
  private baseUrl: string = 'https://migraine-tracker.com:6984/'; // http://127.0.0.1:5984/
  private db: any;
  private remote: any;
  private currentConfiguredRoutine : any = null;

  constructor() {
    PouchDB.plugin(PouchDBAuthentication);
    this.db = new PouchDB('migraine-tracker', {skip_setup: true});
    this.remote = new PouchDB(this.baseUrl);
    this.remote.logIn("migraine-tracker-admin", "migraine-tracker-admin", function (err, response) {
      console.log("Log in as an admin");
    });
  }

  /**
   * Sign up a new user with the given credential info
   * Report errors if the credential info is incorrect or invalid
   * @param credentials
   */
  signUp(credentials) {
    this.remote = new PouchDB(this.baseUrl + 'migraine-tracker-' + credentials.username);
    this.db.sync(this.remote, options).on('error', console.log.bind(console));
    return this.remote.signUp(credentials.username, credentials.password,
      {metadata : {register_time : new Date()}}, function (err, response) {}); // sign up as a new user
  }

  /**
   * Log a registered user into the system given the credential info
   * Report errors if the credential info is incorrect or invalid
   * @param credentials
   */
  login(credentials) {
    this.remote = new PouchDB(this.baseUrl + 'migraine-tracker-' + credentials.username);
    this.db.sync(this.remote, options).on('error', console.log.bind(console));
    return this.remote.logIn(credentials.username, credentials.password, function (err, response) {});
  }

  /**
   * Initialize the user info document for the new user
   * @param username
   */
  initializeUserInfoDoc(username) {
    this.db.put({_id: "user-info", register_time: new Date(), username: username,
      current_configured_routine_id: 0, break: 0}, function(err, response) {
      if (err) { return console.log(err); }
    });
  }

  /**
   * Fetch the current configured routine id from the user info doc in the database
   */
  async fetchCurrentConfiguredRoutineID() {
    try {
      var doc = await this.db.get('user-info');
      return doc['current_configured_routine_id'];
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Return the current configured routine
   */
  getCurrentConfiguredRoutine() {
    return this.currentConfiguredRoutine;
  }

  /**
   * Set the current configured routine id
   * @param current_configured_routine_id
   */
  async logCurrentConfiguredRoutineID(current_configured_routine_id) {
    try {
      var doc = await this.db.get('user-info');
      var response = await this.db.put({
        _id: 'user-info',
        _rev: doc._rev,
        register_time: doc.register_time,
        username: doc.username,
        current_configured_routine_id: current_configured_routine_id,
        break: doc.break,
      });
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Get the quick trackers given the list of selected data
   * @param data
   */
  getQuickTrackers(data) {
    let quickTrackers = [];
    var dataTypes = ['Symptom', 'Treatment', 'Contributor', 'Change', 'Other'];
    for (let i=0; i < dataTypes.length; i++) { // Append the quick tracker data to a list
      if (data.hasOwnProperty(dataTypes[i])) {
        var data_tracked = data[dataTypes[i]];
        if (data_tracked) {
          for (let j=0; j<data_tracked.length; j++) {
            if (data_tracked[j]['quickTrack']) {
              quickTrackers.push(data_tracked[j]);
            }
          }
        }
      }
    }
    return quickTrackers;
  }

  /**
   * Log the configured routine to the database
   * @param data
   */
  async logConfiguredRoutine(data) {
    if (data["dataToTrack"]) {
      data["quickTrackers"] = this.getQuickTrackers(data["dataToTrack"]);
    }
    var currentConfiguredRoutineID = await this.fetchCurrentConfiguredRoutineID();
    currentConfiguredRoutineID = currentConfiguredRoutineID + 1;
    this.logCurrentConfiguredRoutineID(currentConfiguredRoutineID);
    this.db.put({_id: "configured-routine-" + currentConfiguredRoutineID,
      date_added: new Date(), configured_routine: data}, function(err, response) {
      if (err) { return console.log(err); }
    });
    this.currentConfiguredRoutine = data;
  }

  /**
   * Get the current configured routine
   */
  async fetchConfiguredRoutine() {
    var currentConfiguredRoutineID = await this.fetchCurrentConfiguredRoutineID();
    if (currentConfiguredRoutineID != 0) {
      try {
        this.currentConfiguredRoutine = await this.db.get("configured-routine-" + currentConfiguredRoutineID);
        this.currentConfiguredRoutine = this.currentConfiguredRoutine['configured_routine'];
      } catch (err) {
        console.log(err);
      }
    }
    if (this.currentConfiguredRoutine) {
      return this.currentConfiguredRoutine;
    }
    return null;
  }

  /**
   * get the current date
   */
  static getDate() {
      var date = new Date();
      var day = date.getDate();
      var month = date.getMonth() + 1;
      var year = date.getFullYear();
      return [day, month, year];
  }

  /**
   * get the tracked data doc id
   * @param date
   */
  static getTrackedDataDocID(date) {
    return 'tracked-data-' + date[2] + "-" + (date[1] + 1) + "-" + date[0];
  }

  /**
   * merge the old and new tracked data
   * @param oldData
   * @param newData
   */
  static combineTrackedData(oldData, newData) {
    for (let goal in newData) {
      if (!oldData.hasOwnProperty(goal)) {
        oldData[goal] = {};
      }
      for (let data in newData[goal]) {
        oldData[goal][data] = newData[goal][data];
      }
    }
    return oldData;
  }

  /**
   * Log tracked data to the database
   * @param trackedData
   * @param date
   */
  async logTrackedData(trackedData, date) {
    var doc_id = CouchDbServiceProvider.getTrackedDataDocID(date);
    try {
      var doc = await this.db.get(doc_id);
      trackedData = CouchDbServiceProvider.combineTrackedData(doc.tracked_data,trackedData);
      var response = await this.db.put({
        _id: doc_id,
        _rev: doc._rev,
        tracked_data: trackedData,
      });
      console.log("Tracked data saved!");
    } catch (err) {
      this.db.put({_id: doc_id, tracked_data: trackedData}, function(err, response) {
        if (err) {
          return console.log(err);
        }

      });
    }
  }

  /**
   * Get the current configured routine
   * @param date
   */
  async fetchTrackedData(date) {
    var trackedDataDocID = CouchDbServiceProvider.getTrackedDataDocID(date);
    try {
      var trackedDataDoc = await this.db.get(trackedDataDocID);
      return trackedDataDoc['tracked_data'];
    } catch (err) {
      console.log(err);
      return {};
    }
  }










  // ============================================= Old =============================================



  // getTrackedData(): DataReport[] {
  //
  // }


  // // Get the current configured routine
  // async getPreviousTrackedData() : DataReport[] {
  //   // var trackedDataDocID = CouchDbServiceProvider.getTrackedDataDocID();
  //   // try {
  //   //   var trackedDataDoc = await this.db.get(trackedDataDocID);
  //   //   return trackedDataDoc['tracked_data'];
  //   // } catch (err) {
  //   //   console.log(err);
  //   //   return {};
  //   // }
  //   // // if (this.currentConfiguredRoutine) {
  //   // //   return this.currentConfiguredRoutine;
  //   // // }
  //
  //   console.log("!!!!!!!!!!!!!! getTrackedData !!!!!!!!!!!!!");
  //
  //   if(!this.seenConfig) {
  //     return [];
  //   }
  //   console.log(this.trackedData);
  //   if(this.trackedData.length > 0){
  //     return this.trackedData;
  //   }
  //   else{
  //     return this.getExamplePreviouslyTracked();
  //     // return [];
  //   }
  //
  //
  // }




  addGoalFromSetup(setupDict : {[configInfo: string] : any}) : ConfiguredRoutine{
    console.log("!!!!!!!!!!!!!! addGoalFromSetup !!!!!!!!!!!!!");
    // todo: actually push to database; make sure it's doing the right thing when we JUST modify goals!!!!
    let newGoals = setupDict['goalIDs'];
    if(this.currentConfiguredRoutine) { // we need to deactivate the previous goals
      this.currentConfiguredRoutine['deactivated'] = new Date(); // todo: push
      this.currentConfiguredRoutine = null; // since we're creating a new one
    }
    this.currentConfiguredRoutine = {'goals': newGoals,
                            'dataToTrack': setupDict.selectedData,
                            'quickTrackers': setupDict.quickTrackers,
                            'textGoals': setupDict.textGoals,
                            'dateAdded': new Date(),
                            'notifications': setupDict.notifications}; // todo: push

    console.log(this.currentConfiguredRoutine);
    return this.currentConfiguredRoutine;
  }



  // trackData(newData : DataReport) {
  //   console.log("!!!!!!!!!!!!!! trackData !!!!!!!!!!!!!");
  //   console.log(newData); // push to db
  //
  //   // todo: should store a datapoint in couch as a new object
  //   // todo: needs to append start and end time!!!
  //   // this.trackedData.push(newData);
  //   // console.log(this.trackedData);
  // }



  combineDataToTrack(oldDataToTrack : {[dataType:string]: any;},
                     newDataToTrack : {[dataType:string]: any;}) : {[dataType:string]: any;} {
    console.log("!!!!!!!!!!!!!! combineDataToTrack !!!!!!!!!!!!!");
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



  modifyQuickTrackers(quickTrackers){
    console.log("!!!!!!!!!!!!!! modifyQuickTrackers !!!!!!!!!!!!!");
    // todo: push!

    console.log(quickTrackers);
    this.currentConfiguredRoutine.quickTrackers = quickTrackers;
  }

  modifyTrackingRoutine(dataType, newRoutine) {
    console.log("!!!!!!!!!!!!!! modifyTrackingRoutine !!!!!!!!!!!!!");
    // todo: push!  And maybe change date added??
    console.log(dataType);
    console.log(newRoutine);
    this.currentConfiguredRoutine.dataToTrack[dataType] = newRoutine;
  }

  modifyFrequency(newNotifications) {
    console.log("!!!!!!!!!!!!!! modifyFrequency !!!!!!!!!!!!!");
    // todo: push!  And maybe change date added??
    console.log(newNotifications);
    this.currentConfiguredRoutine.notifications = newNotifications;
  }

  modifyGoals(newGoalsObject) {
    console.log("!!!!!!!!!!!!!! modifyGoals !!!!!!!!!!!!!");
    // todo: push!  And maybe change date added??
    this.currentConfiguredRoutine.goals = newGoalsObject['goalIDs'];
    this.currentConfiguredRoutine.textGoals = newGoalsObject['textGoals'];
  }

  removeGoal(goal: string) {
    console.log("!!!!!!!!!!!!!! removeGoal !!!!!!!!!!!!!");
    //todo: dunno if we need this
    // todo: push to database
    if(goal === 'textGoal'){
      this.currentConfiguredRoutine['textGoals'] = undefined;
    }
    else{
      // TODO: nope; we want to make a copy and make the old one the active one
      this.currentConfiguredRoutine['goals'].splice(this.currentConfiguredRoutine['goals'].indexOf(goal), 1);
    }
  }

  editTextGoal(newGoal: string) {
    console.log("!!!!!!!!!!!!!! editTextGoal !!!!!!!!!!!!!");
    // todo: again, dunno if needed
    // todo: push to database
    this.currentConfiguredRoutine['textGoals'] = newGoal;
  }







  getCurrentBreak(): Break {
    // console.log("!!!!!!!!!!!!!! getCurrentBreak !!!!!!!!!!!!!");
    // todo: pull from db, make sure it's current
    // return null;
    return {
      "reasonForBreak": "I want to",
      "started": "2019-02-27",
      "ended": "2020-05-10",
      "checkInDate": "2020-05-10",
      "notifyDate" : "2020-05-10"
    };
  }

// export interface Break {
//   notifyDate?: string,
//   dateToCheckIn?: string,
//   started: Date,
//   ended?: Date,
//   noDates?: boolean,
//   reasonForBreak?: string
// }

  updateBreak(currentBreak: Break) {
    console.log("!!!!!!!!!!!!!! updateBreak !!!!!!!!!!!!!");
    // todo: push to db
    console.log(currentBreak);
  }

  setBreak(newBreak: Break) {
    console.log("!!!!!!!!!!!!!! setBreak !!!!!!!!!!!!!");
    //todo: push to db
    console.log(newBreak);
  }



  // getExampleGoal()  : ConfiguredRoutine {
  //   let exGoal = {
  //     "quickTrackers": [
  //       {
  //         "name": "Migraine",
  //         "id": "migraineToday",
  //         "explanation": "Migraine experienced",
  //         "fieldDescription": "Whether you had a migraine (yes/no)",
  //         "recommendedField": "binary",
  //         "recommendingGoals": ["2a", "2b", "2c", "3", "1a", "1b", "1c"],
  //         "quickTrack": true,
  //         "alwaysQuickTrack": true,
  //         "field": "binary",
  //         "fieldSet": true,
  //         "dataType": "Symptom"
  //       },
  //       {
  //         "name": "As-needed medications today",
  //         "id": "asNeededMeds",
  //         "isMed": true,
  //         "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: Advil, Excedrin, Tylenol, prescription medications you don't take regularly.",
  //         "fieldDescription": "Whether you took any as-needed medication today",
  //         "field": "binary",
  //         "recommendingGoals": [
  //           "1a",
  //           "1b",
  //           "1c",
  //           "2a",
  //           "2b",
  //           "2c",
  //           "3"
  //         ],
  //         "goal": {
  //           "freq": "Less",
  //           "threshold": 4,
  //           "timespan": "Month"
  //         },
  //         "opts": {
  //           "showBackdrop": true,
  //           "enableBackdropDismiss": true
  //         },
  //         "selected": true,
  //         "quickTrack": true,
  //         "dataType": "Treatment"
  //       }
  //     ],
  //       "goals": [
  //         "1",
  //         "2",
  //         "3",
  //         "2a",
  //         "2b",
  //         "2c",
  //         "1a",
  //         "1b",
  //         "1c"
  //       ],
  //       "dataToTrack": {
  //         "Change": [
  //           {
  //             "name": "Healthy Sleep Schedule",
  //             "id": "sleepChange",
  //             "explanation": "How much sleep you got today",
  //             "fieldDescription": "Hours of sleep",
  //             "field": "number",
  //             "goal": {
  //               "freq": "More",
  //               "threshold": 8,
  //               "timespan": "Day"
  //             },
  //             "recommendingGoals": [
  //               "1c"
  //             ],
  //             "startDate": "2019-04-11T16:22:17.264Z",
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           }
  //         ],
  //         "Symptom": [
  //           {
  //             "name": "Migraine today",
  //             "id": "migraineToday",
  //             "explanation": "Migraine experienced today",
  //             "fieldDescription": "Whether you had a migraine (yes/no)",
  //             "field": "binary",
  //             "recommendingGoals": [
  //               "1a",
  //               "1b",
  //               "1c",
  //               "2a",
  //               "2b",
  //               "2c",
  //               "3"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true,
  //             "quickTrack": true,
  //             "fieldSet": true
  //           },
  //           {
  //             "name": "Peak Migraine Severity",
  //             "id": "peakMigraineSeverity",
  //             "explanation": "How bad the migraine was at its worst point",
  //             "fieldDescription": "10-point Pain level (1=mild, 10=terrible)",
  //             "recommendedField": "numeric scale",
  //             "field": "numeric scale",
  //             "recommendingGoals": ["1b", "1c"],
  //             "selected": true
  //           },
  //           {
  //             "name": "Quality of the Pain",
  //             "id": "painQuality",
  //             "explanation": "What the pain was like (pulsating/throbbing, pressure, tension, stabbing, sharp, dull, burning, other)",
  //             "fieldDescription": "Text box where you can describe the pain",
  //             "field": "note",
  //             "recommendingGoals": [
  //               "1b"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Start time",
  //             "id": "migraineStartTime",
  //             "explanation": "The time your migraine started",
  //             "fieldDescription": "time",
  //             "field": "time",
  //             "recommendingGoals": [],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Migraine duration",
  //             "field": "time range",
  //             "id": "custom_migraineduration",
  //             "custom": true
  //           }
  //         ],
  //         "Treatment": [
  //           {
  //             "name": "As-needed medications today",
  //             "id": "asNeededMeds",
  //             "isMed": true,
  //             "fieldsAllowed": ["binary", "number", "time"],
  //             "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: Advil, Excedrin, Tylenol, prescription medications you don't take regularly.",
  //             "fieldDescription": "Whether you took any as-needed medication today",
  //             "field": "binary",
  //             "recommendingGoals": [
  //               "1a",
  //               "1b",
  //               "1c",
  //               "2a",
  //               "2b",
  //               "2c",
  //               "3"
  //             ],
  //             "goal": {
  //               "freq": "Less",
  //               "threshold": 4,
  //               "timespan": "Month"
  //             },
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true,
  //             "quickTrack": true
  //           },
  //           {
  //             "name": "Exercise",
  //             "id": "exerciseToday",
  //             "explanation": "How much you exercised today",
  //             "fieldDescription": "Number of minutes of exercise",
  //             "field": "number",
  //             "goal": {
  //               "freq": "More",
  //               "threshold": 180,
  //               "timespan": "Week"
  //             },
  //             "recommendingGoals": [
  //               "1b",
  //               "2b"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Nutrition Today",
  //             "id": "nutritionToday",
  //             "explanation": "Whether you ate healthily today. For example, we recommend 4-5 servings of veggies, eating regular meals, avoiding sugar",
  //             "fieldDescription": "Whether you ate healthily (yes/no)",
  //             "field": "binary",
  //             "recommendingGoals": [
  //               "1b",
  //               "2b"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Time took advil",
  //             "field": "time",
  //             "id": "custom_timetookadvil",
  //             "custom": true
  //           }
  //         ],
  //         "Contributor": [
  //           {
  //             "name": "Stress",
  //             "id": "stressToday",
  //             "explanation": "How stressed you were today",
  //             "fieldDescription": "3-point stress rating",
  //             "significance": "High stress levels can lead to more migraines",
  //             "field": "category scale",
  //             "recommendingGoals": [
  //               "1b",
  //               "2b"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Frequent Use of Medications",
  //             "id": "frequentMedUse",
  //             "explanation": "Calculated medication use, to let you know if you might want to think about cutting back.",
  //             "fieldDescription": "Number of pills you took",
  //             "field": "calculated medication use",
  //             "condition": true,
  //             "recommendingGoals": [
  //               "1a",
  //               "1b",
  //               "1c",
  //               "2a",
  //               "2b",
  //               "2c",
  //               "3"
  //             ],
  //             "goal": {
  //               "freq": "Less",
  //               "threshold": 4,
  //               "timespan": "Month"
  //             },
  //             "significance": "If you use as-needed medications too frequently, they can start causing more migraines.",
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           },
  //           {
  //             "name": "Alcohol",
  //             "id": "alcoholToday",
  //             "explanation": "How much alcohol you had today",
  //             "fieldDescription": "3-point alcohol rating",
  //             "field": "category scale",
  //             "recommendingGoals": [
  //               "1b",
  //               "2b"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           }
  //         ],
  //         "Other": [
  //           {
  //             "name": "Other notes",
  //             "id": "otherNotes",
  //             "explanation": "Anything else you want to note about today ",
  //             "fieldDescription": "Text box where you can record any notes",
  //             "field": "note",
  //             "recommendingGoals": [
  //               "1a",
  //               "1b",
  //               "1c",
  //               "2a",
  //               "2b",
  //               "2c",
  //               "3"
  //             ],
  //             "opts": {
  //               "showBackdrop": true,
  //               "enableBackdropDismiss": true
  //             },
  //             "selected": true
  //           }
  //         ]
  //       },
  //       "textGoals":
  //         "Get <1 migraine per week",
  //       "dateAdded": "2019-04-11T16:22:17.264Z",
  //       "notifications": {
  //         "retroactive": {
  //           "delayScale": "Day",
  //           "delayNum": 1
  //         }
  //       },
  //     };
  //   this.currentConfiguredRoutine = exGoal;
  //   return exGoal;
  // }



  getExamplePreviouslyTracked() : DataReport[] {
    return [
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "17:39",
          "exerciseToday": 2,
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-06-14T00:00:00.000Z",
        "endTime": "2019-06-15T00:00:00.000Z",
        "Change": {
          "sleepToday": 13
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "03:32",
          "exerciseToday": 16
        },
        "Symptom": {
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
        "startTime": "2019-07-27T00:00:00.000Z",
        "endTime": "2019-07-28T00:00:00.000Z",
        "Change": {
          "sleepToday": 0
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "17:19",
          "nutritionToday": "No",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-04-17T00:00:00.000Z",
        "endTime": "2019-04-18T00:00:00.000Z",
        "Change": {
          "sleepToday": 1
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "00:13",
          "exerciseToday": 7,
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-05-08T00:00:00.000Z",
        "endTime": "2019-05-09T00:00:00.000Z",
        "Change": {
          "sleepToday": 11
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "23:49",
          "exerciseToday": 5,
          "nutritionToday": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-17T00:00:00.000Z",
        "endTime": "2019-06-18T00:00:00.000Z",
        "Change": {
          "sleepToday": 13
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "16:05",
          "exerciseToday": 9,
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
          "peakMigraineSeverity": 5,
          "migraineStartTime": "13:46",
          "migraineToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-07-25T00:00:00.000Z",
        "endTime": "2019-07-26T00:00:00.000Z",
        "Change": {
          "sleepChange": 16
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "06:13",
          "exerciseToday": 17,
          "nutritionToday": "No"
        },
        "Symptom": {
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
        "startTime": "2019-04-20T00:00:00.000Z",
        "endTime": "2019-04-21T00:00:00.000Z",
        "Change": {
          "sleepChange": 0
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "06:05",
          "exerciseToday": 4,
          "nutritionToday": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-04-04T00:00:00.000Z",
        "endTime": "2019-04-05T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "02:43"
        },
        "Symptom": {
          "custom_migraineduration": {
            "start": "10:01",
            "end": "21:34"
          },
          "peakMigraineSeverity": 7,
          "migraineStartTime": "18:06",
          "migraineToday": "No"
        },
        "Other": {},
        "startTime": "2019-04-14T00:00:00.000Z",
        "endTime": "2019-04-15T00:00:00.000Z",
        "Change": {
          "sleepChange": 9
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "00:49",
          "exerciseToday": 7,
          "nutritionToday": "No",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-06-07T00:00:00.000Z",
        "endTime": "2019-06-08T00:00:00.000Z",
        "Change": {
          "sleepChange": 18
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "13:57",
          "exerciseToday": 13,
          "nutritionToday": "Yes",
          // "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-09T00:00:00.000Z",
        "endTime": "2019-07-10T00:00:00.000Z",
        "Change": {
          "sleepChange": 5
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null
        },
        "Treatment": {
          "exerciseToday": 7,
          "nutritionToday": "Yes"
        },
        "Symptom": {
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-07-24T00:00:00.000Z",
        "endTime": "2019-07-25T00:00:00.000Z",
        "Change": {
          "sleepChange": 0
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "asNeededMeds": "No"
        },
        "Symptom": {
          "migraineStartTime": "01:15"
        },
        "Other": {
          "otherNotes": "note contents moot",
          "whetherMedsWorked": "Some"
        },
        "startTime": "2019-05-03T00:00:00.000Z",
        "endTime": "2019-05-04T00:00:00.000Z",
        "Change": {
          "sleepChange": 4
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "08:19",
          "exerciseToday": 16,
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-05-13T00:00:00.000Z",
        "endTime": "2019-05-14T00:00:00.000Z",
        "Change": {
          "sleepChange": 0
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "03:35",
          "exerciseToday": 2,
          "nutritionToday": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-15T00:00:00.000Z",
        "endTime": "2019-07-16T00:00:00.000Z",
        "Change": {
          "sleepChange": 15
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "05:55",
          "exerciseToday": 12,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptom": {
          "peakMigraineSeverity": 5,
          "migraineStartTime": "05:48",
          "migraineToday": "Yes",
          "headacheToday": "No"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-07-07T00:00:00.000Z",
        "endTime": "2019-07-08T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "nutritionToday": "Yes",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
          "peakMigraineSeverity": 8,
          "migraineStartTime": "01:06",
          "migraineToday": "No",
          "headacheToday": "Yes"
        },
        "Other": {
          "otherNotes": "note contents moot"
        },
        "startTime": "2019-04-05T00:00:00.000Z",
        "endTime": "2019-04-06T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "exerciseToday": 14,
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-22T00:00:00.000Z",
        "endTime": "2019-06-23T00:00:00.000Z",
        "Change": {
          "sleepChange": 16
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "12:27",
          "exerciseToday": 15,
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-04-04T00:00:00.000Z",
        "endTime": "2019-04-05T00:00:00.000Z",
        "Change": {
          "sleepChange": 7
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "06:58"
        },
        "Symptom": {
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
        "startTime": "2019-05-23T00:00:00.000Z",
        "endTime": "2019-05-24T00:00:00.000Z",
        "Change": {
          "sleepChange": 9
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "11:39",
          "exerciseToday": 7,
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-20T00:00:00.000Z",
        "endTime": "2019-07-21T00:00:00.000Z",
        "Change": {
          "sleepChange": 18
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "08:35",
          "exerciseToday": 11,
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-05T00:00:00.000Z",
        "endTime": "2019-07-06T00:00:00.000Z",
        "Change": {
          "sleepChange": 3
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "stressToday": "None"
        },
        "Treatment": {
          "exerciseToday": 16,
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-04-27T00:00:00.000Z",
        "endTime": "2019-04-28T00:00:00.000Z",
        "Change": {
          "sleepChange": 3
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "20:29",
          "exerciseToday": 4,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-22T00:00:00.000Z",
        "endTime": "2019-06-23T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "11:48",
          "exerciseToday": 13,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-11T00:00:00.000Z",
        "endTime": "2019-07-12T00:00:00.000Z",
        "Change": {
          "sleepChange": 12
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "nutritionToday": "No",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-03T00:00:00.000Z",
        "endTime": "2019-06-04T00:00:00.000Z",
        "Change": {
          "sleepChange": 15
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "04:12",
          "exerciseToday": 14,
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-13T00:00:00.000Z",
        "endTime": "2019-06-14T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "11:17",
          "exerciseToday": 15,
          "nutritionToday": "No",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
          "custom_migraineduration": {
            "start": "23:45",
            "end": "23:46"
          },
          "migraineToday": "Yes"
        },
        "Other": {
          "whetherMedsWorked": "None"
        },
        "startTime": "2019-04-12T00:00:00.000Z",
        "endTime": "2019-04-13T00:00:00.000Z",
        "Change": {
          "sleepChange": 10
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "12:17",
          "nutritionToday": "Yes",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-06-04T00:00:00.000Z",
        "endTime": "2019-06-05T00:00:00.000Z",
        "Change": {
          "sleepChange": 8
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "12:47",
          "exerciseToday": 0,
          "nutritionToday": "Yes",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-05-07T00:00:00.000Z",
        "endTime": "2019-05-08T00:00:00.000Z",
        "Change": {
          "sleepChange": 8
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "stressToday": "Some"
        },
        "Treatment": {
          "exerciseToday": 4,
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-07-18T00:00:00.000Z",
        "endTime": "2019-07-19T00:00:00.000Z",
        "Change": {
          "sleepChange": 10
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "10:38",
          "nutritionToday": "Yes",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-05-16T00:00:00.000Z",
        "endTime": "2019-05-17T00:00:00.000Z",
        "Change": {}
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "None",
          "frequentMedUse": null
        },
        "Treatment": {
          "custom_timetookadvil": "11:27",
          "asNeededMeds": "No"
        },
        "Symptom": {
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
        "startTime": "2019-05-20T00:00:00.000Z",
        "endTime": "2019-05-21T00:00:00.000Z",
        "Change": {
          "sleepChange": 16
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "alcoholToday": "Some",
          "frequentMedUse": null,
          "stressToday": "None"
        },
        "Treatment": {
          "custom_timetookadvil": "00:17",
          "exerciseToday": 9,
          "nutritionToday": "Yes",
          // "asNeededMeds": "Yes"
        },
        "Symptom": {
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
        "startTime": "2019-06-07T00:00:00.000Z",
        "endTime": "2019-06-08T00:00:00.000Z",
        "Change": {
          "sleepChange": 8
        }
      },
      {
        "allDay": "true",
        "Contributor": {
          "frequentMedUse": null,
          "stressToday": "Some"
        },
        "Treatment": {
          "custom_timetookadvil": "12:39",
          "exerciseToday": 3,
          "nutritionToday": "No"
        },
        "Symptom": {
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
        "startTime": "2019-06-22T00:00:00.000Z",
        "endTime": "2019-06-23T00:00:00.000Z",
        "Change": {
          "sleepChange": 0
        }
      }
    ]
  }


}
