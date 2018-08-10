import { NgModule } from '@angular/core';
import { VehicleComponent } from './components/vehicle/vehicle.component';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: VehicleComponent
  }
  // {
  //   path: 'account',
  //   loadChildren: 'app/account/account.module#AccountModule'
  // }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
