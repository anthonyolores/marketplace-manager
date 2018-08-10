import { Component, OnInit } from '@angular/core';
import { VehicleService} from '../../services/vehicle.service';
import { Vehicle } from '../../models/Vehicle';
import { SelectionModel } from '@angular/cdk/collections';
@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrls: ['./vehicle.component.css']
})

export class VehicleComponent implements OnInit {

  public vehicleId:string="";
  public activeVehicles:Array<Vehicle>;
  public CSVType:number = 1;
  public fbUser = "Samuel";
  displayedColumns = ['VehicleId', 'Name', 'Specs', 'URL', 'FBUser', 'Select' ];
  dataSource: Vehicle[] = [];

  initialSelection = [];
  allowMultiSelect = true;
  selection = new SelectionModel<Vehicle>(this.allowMultiSelect, this.initialSelection);

  constructor(private vehicleService:VehicleService) { }

  ngOnInit() {
    this.getActiveVehicles(this.CSVType);
  }
 
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.length;
    return numSelected == numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.forEach(row => this.selection.select(row));
  }

  addVehicle(){
    this.vehicleService.AddVehicle(this.vehicleId, this.fbUser).subscribe(
    data => {
      let res = JSON.parse(data);
      
      if(res == '0'){
        alert("Vehicle not Found!");
        console.log("Vehicle not Found!");
      }
      else{
        this.getActiveVehicles(this.CSVType);
        console.log("Added " + res);
      }
    }, 
    err => {
    });
  }  

  deleteVehicle(){
    let deleteId:string = this.selection.selected[0].VehicleId + "";
    let vehicleIds:Array<String> = [];

    //get vehicles ids to be deleted
    if(this.selection.selected != null && this.selection.selected.length > 0){
      this.selection.selected.forEach(vehicle => {
        vehicleIds.push(vehicle.VehicleId + "");
      });
    }

    this.vehicleService.DeleteVehicle(vehicleIds, this.CSVType).subscribe(
    data => {
      let tempVehicle = JSON.parse(data) + "";
      this.getActiveVehicles(this.CSVType);
    }, 
    err => {
    });
  }

  getActiveVehicles(CSVTYpe:number){
    this.vehicleService.GetActiveVehicles(CSVTYpe).subscribe(
    data => {
      this.activeVehicles = data;
      this.dataSource = data;
      //return JSON.parse(data);
      console.log("NEW VEHICLES");
      console.log(this.activeVehicles);
    }, 
    err => {
    });
  }

  getActiveVehicle(){
    this.vehicleService.GetActiveVehicle(this.vehicleId).subscribe(
    data => {
     // let activeVehicles = JSON.parse(data);
      return data["data"].GetVehicle as Vehicle;
    }, 
    err => {
      return null;
    });
  }
  updateVehicles(){
    this.vehicleService.UpdateVehicles().subscribe(
    data => {
     // let activeVehicles = JSON.parse(data);
      console.log(data);
    }, 
    err => {
    });
  } 
  updateVehicle(){
    this.vehicleService.UpdateVehicle(this.vehicleId).subscribe(
    data => {
     // let activeVehicles = JSON.parse(data);
      console.log(data);
    }, 
    err => {
    });
  } 

  saveActiveVehicles(){
    this.vehicleService.SaveActiveVehicles().subscribe(
    data => {
     // let activeVehicles = JSON.parse(data);
      console.log(data);
    }, 
    err => {
    });
  } 
}
