import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CouchDbServiceProvider } from "../../providers/couch-db-service/couch-db-service";
import { DataDetailsServiceProvider } from "../../providers/data-details-service/data-details-service";
import { DataConfigPage } from "../addGoal/data-config/data-config";
import { DataElement } from "../../interfaces/customTypes";


@Component({
  selector: 'page-tracking-modification',
  templateUrl: 'tracking-modification.html',
})

export class TrackingModificationPage {
  private configuredRoutine : any = {};
  private goals : string[];
  private currentData : {[dataType: string] : DataElement[]} = {};
  private allDataTypes : string[] = [];

  constructor(public navCtrl: NavController, public navParams: NavParams,
              private couchDBService: CouchDbServiceProvider,
              public dataDetailsServiceProvider: DataDetailsServiceProvider,
              private dataDetailsService: DataDetailsServiceProvider) {
  }

  async ionViewDidLoad() {
    if (this.navParams.data && this.navParams.data.params && this.navParams.data.params['modifyData']) {
      this.configuredRoutine = this.navParams.data.configuredRoutine;
      this.couchDBService.logConfiguredRoutine(this.configuredRoutine);
    } else {
      this.configuredRoutine = await this.couchDBService.fetchConfiguredRoutine();
    }
    this.goals = this.configuredRoutine['goals'];
    this.currentData = this.configuredRoutine['dataToTrack'];
    this.allDataTypes = this.dataDetailsService.getDataList(this.configuredRoutine['goals']);
  }

  editData(dataType) {
    let params = {'modifyData': true, 'dataPage': this.dataDetailsServiceProvider.getConfigByName(dataType)};
    this.navCtrl.push(DataConfigPage,
        {'configuredRoutine': this.configuredRoutine, 'params': params}, {animate: false});
  }
}
