import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';



import {Vehicle} from '../models/Vehicle';

@Injectable()
export class VehicleService {

  private nodeServerURL = 'http://localhost:8085/';
  constructor(private http: HttpClient) { }

  AddVehicle(vehicleId:string, fbUser: string): Observable<string>{
    return this.http
      .get<string>(`${this.nodeServerURL}addvehicle/?vehicleId=` + vehicleId + '&&fbUser=' + fbUser);
  }

  DeleteVehicle(vehicleIds:Array<any>, CSVType:number): Observable<any>{

    let headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    let url = `${this.nodeServerURL}deletevehicle/`;

    return this.http.post(url, {vehicleIds:vehicleIds, CSVType: CSVType}, {headers: headers});

    // return this.http
    //   .get<string>(`${this.nodeServerURL}deletevehicle/?vehicleId=` + vehicleId);
  }

  UpdateVehicle(vehicleId:string): Observable<string>{
    return this.http
      .get<string>(`${this.nodeServerURL}updatevehicle/?vehicleId=` + vehicleId);
  }
  UpdateVehicles(): Observable<Vehicle[]>{
    let headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    let url = `${this.nodeServerURL}updateVehicles/`;
    return this.http
    .get<Vehicle[]>(`${this.nodeServerURL}updatevehicles/`);
    //return this.http.post(`${this.nodeServerURL}updatevehicle/?vehicleId=` + vehicleId,null, {headers: headers});
  }

  GetActiveVehicles(CSVType:number): Observable<Vehicle[]>{
    return this.http
      .get<Vehicle[]>(`${this.nodeServerURL}getactivevehicles/?CSVType=` + CSVType);
  }

  GetActiveVehicle(vehicleId:string): Observable<any>{
    return this.http
      .get<any>((`${this.nodeServerURL}getactivevehicle/?vehicleId=` + vehicleId));
  }

  SaveActiveVehicles(): Observable<any>{
    return this.http
      .get<any>((`${this.nodeServerURL}saveactivevehicles/?CSVType=`));
  }
}
