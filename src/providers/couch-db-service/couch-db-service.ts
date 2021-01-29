import PouchDB from 'pouchdb';
import moment from 'moment';
import PouchDBAuthentication from 'pouchdb-authentication';
import { Injectable } from '@angular/core';
import { ConfiguredRoutine, DataElement, Notification } from "../../interfaces/customTypes";
import { DataReport } from "../../interfaces/customTypes";
import { Break } from "../../interfaces/customTypes";
import { HttpClient } from '@angular/common/http';

let options = {
  live: true,
  retry: true,
  continuous: true
};


@Injectable()
export class CouchDbServiceProvider {
  private baseUrl: string = 'http://migraine-tracker.com:5984/'; //'https://migraine-tracker.com:6984/'; // http://127.0.0.1:5984/
  private db: any;
  private remote: any;
  private currentConfiguredRoutine : any = null;

  constructor(public http: HttpClient) {
    PouchDB.plugin(PouchDBAuthentication);
    this.db = new PouchDB('migraine-tracker', {skip_setup: true});
    this.remote = new PouchDB(this.baseUrl);
    // this.remote.logIn("migraine-tracker-admin", "migraine-tracker-admin", function (err, response) {
    //   console.log("Log in as an admin");
    // });
    // this.remote.logIn("lwjiang2", "lwjiang2", function (err, response) {
    //   console.log("Log in as an admin");
    // });
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
      current_configured_routine_id: 0, current_break_id: 0}, function(err, response) {
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
  async logTrackedData(trackedData, trackedDataField, date) {
    var doc_id = CouchDbServiceProvider.getTrackedDataDocID(date);
    try {
      var doc = await this.db.get(doc_id);
      trackedData = CouchDbServiceProvider.combineTrackedData(doc.tracked_data, trackedData);
      trackedDataField = CouchDbServiceProvider.combineTrackedData(doc.tracked_data_field, trackedDataField);
      var response = await this.db.put({
        _id: doc_id,
        _rev: doc._rev,
        tracked_data: trackedData,
        tracked_data_field: trackedDataField,
      });

      /* comment for simulating delay in sving */
      //console.log("Tracked data saved!");
      //return true;
      /* uncomment for simulating delay in sving */
      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          console.log("Tracked data saved!");
          resolve(true);
        }, 3000);
      });

    } catch (err) {
      console.log("YSS Error occured while saving tracked data.");
      this.db.put({_id: doc_id, tracked_data: trackedData,
        tracked_data_field: trackedDataField}, function(err, response) {
        if (err) {
          console.log(err);
          return false;
        }
      });
    }
  }

  /**
   * Get the tracked data by date
   * @param date
   */
  async fetchTrackedData(date) {
    var trackedDataDocID = CouchDbServiceProvider.getTrackedDataDocID(date);
    //console.log("############");
    //console.log(trackedDataDocID)
    try {
      var trackedDataDoc = await this.db.get(trackedDataDocID);
      //console.log("YSS in fetchTrackedData", trackedDataDoc['tracked_data'], "then", 'Symptom' in trackedDataDoc['tracked_data'] ? Object.keys(trackedDataDoc['tracked_data']['Symptom']).length : -1);
      return trackedDataDoc['tracked_data'];
    } catch (err) {
      console.log(err);
      return {};
    }
  }

  /**
   * Get an array of moment instances, each representing a day beween given timestamps.
   * @param {string|Date} from start date
   * @param {string|Date} to end date
   */
  daysBetween(from, to) {
    const fromDate = moment(new Date(from)).startOf('day');
    const toDate = moment(new Date(to)).endOf('day');
    const span = moment.duration(toDate.diff(fromDate)).asDays();
    const days = [];
    for (let i = 0; i <= span; i++) {
      days.push(moment(fromDate).add(i, 'day').startOf('day'));
    }
    return days;
  }

  /**
   * Fetch a list of tracked data between a given start date and an end date
   * @param startDate
   * @param endDate
   */
  async fetchTrackedDataRange(startDate, endDate) {
    let trackingData = [];
    let days = this.daysBetween(startDate, endDate);
    let dateList = days.map(d => [Number(d.format('DD')),
      Number(d.format('MM')) - 1, Number(d.format('YYYY'))]);
    for (var i = 0; i < dateList.length; i++) {
      try {
        var trackedDataDocID = CouchDbServiceProvider.getTrackedDataDocID(dateList[i]);
        var trackedDataDoc = await this.db.get(trackedDataDocID)
        trackingData.push([trackedDataDoc['tracked_data'],
          trackedDataDoc['tracked_data_field'],
          days[i].toDate()]);
      } catch (err) {
      }
    }
    return trackingData;
  }

  /**
   * Fetch the current break id from the user info doc in the database
   */
  async fetchCurrentBreakID() {
    try {
      var doc = await this.db.get('user-info');
      return doc['current_break_id'];
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Set the current break id
   * @param current_break_id
   */
  async logCurrentBreakID(current_break_id) {
    try {
      var doc = await this.db.get('user-info');
      var response = await this.db.put({
        _id: 'user-info',
        _rev: doc._rev,
        register_time: doc.register_time,
        username: doc.username,
        current_break_id: current_break_id,
        break: doc.break,
      });
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Log the break to the database
   * @param data
   * @param end
   */
  async logBreak(data, end : boolean=false) {
    var currentBreakID = await this.fetchCurrentBreakID();
    try {
      var doc = await this.db.get('break-' + currentBreakID);
      let break_data = doc['break'];
      break_data[doc.id + 1] = data;
      var response = await this.db.put({
        _id: doc._id,
        _rev: doc._rev,
        break: break_data,
        id: doc.id + 1,
      });
      if (end) {
        this.logCurrentBreakID(currentBreakID + 1);
      }
      console.log("Break saved!");
    } catch (err) {
      let break_data = {};
      break_data[0] = data;
      this.db.put({_id: "break-" + currentBreakID, break: break_data, id: 0}, function(err, response) {
        if (err) {
          return console.log(err);
        }
      });
      console.log("Break added!");
    }
  }

  /**
   * Get the current break
   */
  async fetchBreak() {
    var currentBreakID = await this.fetchCurrentBreakID();
    try {
      let break_doc = await this.db.get('break-' + currentBreakID);
      return break_doc['break'][break_doc.id];
    } catch (err) {
      return {};
    }
  }





  // ============================================= Old =============================================
  getExampleGoal()  : ConfiguredRoutine {
    let exGoal = {
      "quickTrackers": [
        {
          "name": "Migraine",
          "id": "migraineToday",
          "explanation": "Migraine experienced",
          "fieldDescription": "Whether you had a migraine (yes/no)",
          "recommendedField": "binary",
          "recommendingGoals": ["2a", "2b", "2c", "3", "1a", "1b", "1c"],
          "quickTrack": true,
          "alwaysQuickTrack": true,
          "field": "binary",
          "fieldSet": true,
          "dataType": "Symptom"
        },
        {
          "name": "As-needed Medications Today",
          "id": "asNeededMeds",
          "isMed": true,
          "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: Advil, Excedrin, Tylenol, prescription medications you don't take regularly.",
          "fieldDescription": "Whether you took any as-needed medication today",
          "field": "binary",
          "recommendingGoals": [
            "1a",
            "1b",
            "1c",
            "2a",
            "2b",
            "2c",
            "3"
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
          "selected": true,
          "quickTrack": true,
          "dataType": "Treatment"
        }
      ],
        "goals": [
          "1",
          "2",
          "3",
          "2a",
          "2b",
          "2c",
          "1a",
          "1b",
          "1c"
        ],
        "dataToTrack": {
          "Change": [
            {
              "name": "Healthy Sleep Schedule",
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
              "name": "Migraine Today",
              "id": "migraineToday",
              "explanation": "Migraine experienced today",
              "fieldDescription": "Whether you had a migraine (yes/no)",
              "field": "binary",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2a",
                "2b",
                "2c",
                "3"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true,
              "quickTrack": true,
              "fieldSet": true
            },
            {
              "name": "Peak Migraine Severity",
              "id": "peakMigraineSeverity",
              "explanation": "How bad the migraine was at its worst point",
              "fieldDescription": "10-point Pain level (1=mild, 10=terrible)",
              "recommendedField": "numeric scale",
              "field": "numeric scale",
              "recommendingGoals": ["1b", "1c"],
              "selected": true
            },
            {
              "name": "Quality of the Pain",
              "id": "painQuality",
              "explanation": "What the pain was like (pulsating/throbbing, pressure, tension, stabbing, sharp, dull, burning, other)",
              "fieldDescription": "Text box where you can describe the pain",
              "field": "note",
              "recommendingGoals": [
                "1b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Start Time",
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
              "name": "Migraine Duration",
              "field": "time range",
              "id": "custom_migraineduration",
              "custom": true
            }
          ],
          "Treatment": [
            {
              "name": "As-needed Medications Today",
              "id": "asNeededMeds",
              "isMed": true,
              "fieldsAllowed": ["binary", "number", "time"],
              "explanation": "Any medication you take on an as-needed basis (in response to symptoms).  For example: Advil, Excedrin, Tylenol, prescription medications you don't take regularly.",
              "fieldDescription": "Whether you took any as-needed medication today",
              "field": "binary",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2a",
                "2b",
                "2c",
                "3"
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
              "selected": true,
              "quickTrack": true
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
                "2b"
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
                "2b"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            },
            {
              "name": "Time Took Advil",
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
                "2b"
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
                "2a",
                "2b",
                "2c",
                "3"
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
                "2b"
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
              "name": "Other Notes",
              "id": "otherNotes",
              "explanation": "Anything else you want to note about today ",
              "fieldDescription": "Text box where you can record any notes",
              "field": "note",
              "recommendingGoals": [
                "1a",
                "1b",
                "1c",
                "2a",
                "2b",
                "2c",
                "3"
              ],
              "opts": {
                "showBackdrop": true,
                "enableBackdropDismiss": true
              },
              "selected": true
            }
          ]
        },
        "textGoals":
          "Get <1 migraine per week",
        "dateAdded": "2019-04-11T16:22:17.264Z",
        "notifications": {
          "retroactive": {
            "delayScale": "Day",
            "delayNum": 1
          }
        },
      };
    this.currentConfiguredRoutine = exGoal;
    return exGoal;
  }



  getExamplePreviouslyTracked() {

    return [ [
      {
        "Changes": {
          "sleepToday": 7
        },
        "Symptoms": {
          "migraineToday": "No",
          "headacheToday": "Yes",
          "migraineStartTime": "02:21",
          "peakMigraineSeverity": 3
        },
        "Treatments": {
          "asNeededMeds": "No",
          "exerciseToday": 0,
          "nutritionToday": "Yes"
        },
        "Contributors": {
          "frequentMedUse": null,
          "stressToday": "None",
          "alcoholToday": "Some"
        },
        "Other": {
          "whetherMedsWorked": "None",
          "otherNotes": "note contents moot"
        }
      },
      {
        "Changes": {
          "sleepToday": "number"
        },
        "Symptoms": {
          "migraineToday": "binary",
          "headacheToday": "binary",
          "migraineStartTime": "time",
          "peakMigraineSeverity": "numeric scale",
          "custom_migraineduration": "time range"
        },
        "Treatments": {
          "asNeededMeds": "binary",
          "exerciseToday": "number",
          "nutritionToday": "binary",
          "custom_timetookadvil": "time"
        },
        "Contributors": {
          "frequentMedUse": "calculated medication use",
          "stressToday": "category scale",
          "alcoholToday": "category scale"
        },
        "Other": {
          "whetherMedsWorked": "category scale",
          "otherNotes": "note"
        }
      }
    ],
      [
        {
          "Changes": {
            "sleepToday": 11
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "00:50",
            "peakMigraineSeverity": 10
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "nutritionToday": "No",
            "custom_timetookadvil": "09:05"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 11
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No"
          },
          "Treatments": {
            "exerciseToday": 11,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "00:06"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 6
          },
          "Symptoms": {
            "migraineToday": "No",
            "migraineStartTime": "07:40",
            "peakMigraineSeverity": 6
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 9,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "08:58"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 6
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "migraineStartTime": "17:00",
            "peakMigraineSeverity": 1,
            "custom_migraineduration": {
              "start": "23:10",
              "end": "23:40"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 0,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "21:53"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "None"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 18
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "peakMigraineSeverity": 1
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 11,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "06:36"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "Some"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 4
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "04:47",
            "peakMigraineSeverity": 6
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 3,
            "nutritionToday": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "Some"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 10
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "01:36",
            "peakMigraineSeverity": 6,
            "custom_migraineduration": {
              "start": "08:30",
              "end": "18:52"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 2,
            "nutritionToday": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": "Some"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 18
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "migraineStartTime": "13:11",
            "peakMigraineSeverity": 8,
            "custom_migraineduration": {
              "start": "19:03",
              "end": "21:04"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 13,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "02:14"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": "Some"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 2
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "migraineStartTime": "19:37",
            "custom_migraineduration": {
              "start": "17:36",
              "end": "22:51"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 3,
            "nutritionToday": "No",
            "custom_timetookadvil": "22:13"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "Some"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 12
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "No",
            "migraineStartTime": "06:21",
            "custom_migraineduration": {
              "start": "18:58",
              "end": "23:58"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 8,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "10:17"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 19
          },
          "Symptoms": {
            "headacheToday": "Yes",
            "migraineStartTime": "04:13",
            "custom_migraineduration": {
              "start": "21:53",
              "end": "21:57"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 7,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "03:08"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 2
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "No",
            "migraineStartTime": "22:31",
            "peakMigraineSeverity": 8,
            "custom_migraineduration": {
              "start": "05:15",
              "end": "08:37"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 14,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "15:51"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 17
          },
          "Symptoms": {
            "headacheToday": "No",
            "migraineStartTime": "17:50",
            "peakMigraineSeverity": 1
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 3,
            "nutritionToday": "No",
            "custom_timetookadvil": "23:02"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 7
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "migraineStartTime": "07:51",
            "peakMigraineSeverity": 7,
            "custom_migraineduration": {
              "start": "12:28",
              "end": "18:38"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 19,
            "nutritionToday": "Yes",
            "custom_timetookadvil": "13:21"
          },
          "Contributors": {
            "frequentMedUse": null
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 9
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "No",
            "migraineStartTime": "21:48",
            "peakMigraineSeverity": 4,
            "custom_migraineduration": {
              "start": "15:25",
              "end": "20:51"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 5
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "None"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 17
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "migraineStartTime": "10:08",
            "peakMigraineSeverity": 2,
            "custom_migraineduration": {
              "start": "00:00",
              "end": "21:27"
            }
          },
          "Treatments": {
            "exerciseToday": 16,
            "nutritionToday": "No",
            "custom_timetookadvil": "00:07"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 10
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "09:06",
            "peakMigraineSeverity": 2,
            "custom_migraineduration": {
              "start": "14:17",
              "end": "15:45"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": 3,
            "custom_timetookadvil": "17:08"
          },
          "Contributors": {
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "peakMigraineSeverity": 9,
            "custom_migraineduration": {
              "start": "19:38",
              "end": "19:42"
            }
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "10:51"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "Some"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 17
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "migraineStartTime": "03:57",
            "peakMigraineSeverity": 3,
            "custom_migraineduration": {
              "start": "18:24",
              "end": "23:58"
            }
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": 11,
            "nutritionToday": "No",
            "custom_timetookadvil": "15:28"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "numeric scale",
            "custom_migraineduration": "time range"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "number",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 13
          },
          "Symptoms": {
            "migraineToday": "No",
            "peakMigraineSeverity": 10,
            "custom_migraineduration": 16
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "nutritionToday": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 5
          },
          "Symptoms": {
            "headacheToday": "No",
            "migraineStartTime": "16:07",
            "peakMigraineSeverity": 16,
            "custom_migraineduration": 11
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "02:18"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "headacheToday": "No",
            "migraineStartTime": "05:57",
            "peakMigraineSeverity": 19
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": "No",
            "nutritionToday": "No",
            "custom_timetookadvil": "08:12"
          },
          "Contributors": {
            "stressToday": "None",
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 1
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "migraineStartTime": "17:19",
            "peakMigraineSeverity": 15,
            "custom_migraineduration": 6
          },
          "Treatments": {
            "exerciseToday": "Yes",
            "nutritionToday": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 6
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "18:11",
            "custom_migraineduration": 4
          },
          "Treatments": {
            "exerciseToday": "Yes",
            "custom_timetookadvil": "20:14"
          },
          "Contributors": {
            "alcoholToday": "Some"
          },
          "Other": {}
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 17
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "00:29"
          },
          "Treatments": {
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "06:37"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "None"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 15
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "migraineStartTime": "05:54",
            "peakMigraineSeverity": 5,
            "custom_migraineduration": 11
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "nutritionToday": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "Some",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "headacheToday": "No",
            "migraineStartTime": "14:08",
            "peakMigraineSeverity": 6,
            "custom_migraineduration": 3
          },
          "Treatments": {
            "exerciseToday": "No",
            "nutritionToday": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "None"
          },
          "Other": {
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "peakMigraineSeverity": 17,
            "custom_migraineduration": 6
          },
          "Treatments": {
            "exerciseToday": "No",
            "nutritionToday": "No",
            "custom_timetookadvil": "19:45"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {}
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 13
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes"
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "17:18"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": "Some"
          },
          "Other": {
            "whetherMedsWorked": "None",
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "time"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "category scale"
          },
          "Other": {
            "whetherMedsWorked": "category scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 16
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "peakMigraineSeverity": 6,
            "custom_migraineduration": 7
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": "No",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": 6
          },
          "Other": {
            "whetherMedsWorked": 10,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 19
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "Yes",
            "peakMigraineSeverity": 17,
            "custom_migraineduration": 17
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": "Yes",
            "custom_timetookadvil": "No"
          },
          "Contributors": {
            "stressToday": "None",
            "alcoholToday": 7
          },
          "Other": {
            "whetherMedsWorked": 10,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 12
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "No",
            "migraineStartTime": "13:58",
            "peakMigraineSeverity": 14,
            "custom_migraineduration": 2
          },
          "Treatments": {
            "exerciseToday": "Yes"
          },
          "Contributors": {
            "stressToday": "Some",
            "alcoholToday": 5
          },
          "Other": {
            "whetherMedsWorked": 8,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 2
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "headacheToday": "No",
            "migraineStartTime": "13:41",
            "custom_migraineduration": 8
          },
          "Treatments": {
            "asNeededMeds": "No",
            "nutritionToday": "No",
            "custom_timetookadvil": "No"
          },
          "Contributors": {
            "stressToday": "None",
            "alcoholToday": 6
          },
          "Other": {
            "whetherMedsWorked": 3,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "migraineStartTime": "12:40",
            "peakMigraineSeverity": 0,
            "custom_migraineduration": 7
          },
          "Treatments": {
            "asNeededMeds": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "alcoholToday": 10
          },
          "Other": {
            "whetherMedsWorked": 4,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "16:02",
            "peakMigraineSeverity": 10,
            "custom_migraineduration": 16
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": "No",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": 3
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "No",
            "migraineStartTime": "20:15",
            "peakMigraineSeverity": 3
          },
          "Treatments": {
            "asNeededMeds": "No",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": 2
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 14
          },
          "Symptoms": {
            "migraineToday": "Yes",
            "migraineStartTime": "01:57",
            "peakMigraineSeverity": 12,
            "custom_migraineduration": 15
          },
          "Treatments": {
            "asNeededMeds": "No",
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None"
          },
          "Other": {
            "whetherMedsWorked": 1,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {},
          "Symptoms": {
            "headacheToday": "No",
            "migraineStartTime": "00:36",
            "custom_migraineduration": 14
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "No"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "None",
            "alcoholToday": 4
          },
          "Other": {
            "whetherMedsWorked": 5,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ],
      [
        {
          "Changes": {
            "sleepToday": 7
          },
          "Symptoms": {
            "migraineToday": "No",
            "headacheToday": "Yes",
            "peakMigraineSeverity": 11,
            "custom_migraineduration": 5
          },
          "Treatments": {
            "asNeededMeds": "Yes",
            "exerciseToday": "Yes",
            "nutritionToday": "Yes",
            "custom_timetookadvil": "Yes"
          },
          "Contributors": {
            "frequentMedUse": null,
            "stressToday": "Some",
            "alcoholToday": 8
          },
          "Other": {
            "whetherMedsWorked": 8,
            "otherNotes": "note contents moot"
          }
        },
        {
          "Changes": {
            "sleepToday": "number"
          },
          "Symptoms": {
            "migraineToday": "binary",
            "headacheToday": "binary",
            "migraineStartTime": "time",
            "peakMigraineSeverity": "number",
            "custom_migraineduration": "number"
          },
          "Treatments": {
            "asNeededMeds": "binary",
            "exerciseToday": "binary",
            "nutritionToday": "binary",
            "custom_timetookadvil": "binary"
          },
          "Contributors": {
            "frequentMedUse": "calculated medication use",
            "stressToday": "category scale",
            "alcoholToday": "numeric scale"
          },
          "Other": {
            "whetherMedsWorked": "numeric scale",
            "otherNotes": "note"
          }
        }
      ]
    ]
  }
}
