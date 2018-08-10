

var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var stringify = require('csv-stringify');
var csvparse = require('csv-parse');
var fs 		= require('fs');
var app     = express();
const expressGraphQL = require('express-graphql');
const graphQLSchema = require('./graphql-schema.js');
const path = require('path');
const bodyParser = require('body-parser');
const activevehicles = "marketplacevehicles.csv";
const notactivevehicles = "notactive_marketplacevehicles.csv";
const apiURL = "https://www.autoport.nz/api/service.ashx";
const preUrl = "www.autoport.nz/vehicle/";
const axios = require('axios');
let d = new Date();

const jsonHeader = {'content-type':'application/json'};
const graphQLUrl = "http://localhost:8085/nodegraphql";

const columns = {
	VehicleId: "VehicleId",
	Name: "Name",
	Specs: "Specs",
	Status:"Status",
	Price: "Price",
	View: "View",
	Inquiry: "Inquiry",
	Posted: "Posted",
	Deleted: "Deleted",
	URL: "URL",
	FBUser: "FBUser"
}

app.use('/nodegraphql', expressGraphQL({
    schema:graphQLSchema,
    graphiql:true
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/marketplace-mgr/dist')));

app.get('/',(request, response) => {
});

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });

 app.get('/getactivevehicles', function(req, res){

	//get all vehicles from JSON server
	getVehicles(req.query.CSVType)
	.then(vehicles => {			
		res.send(vehicles);
		//if there's at least 1 active vehicle
		if(false && vehicles.length > 0){
			const vehicleChecker = [];
			//iterate active vehicles if exists from retail website
			vehicles.forEach((v, index) => {
				//store to a array of promises result of checking
				vehicleChecker.push(new Promise(resolve => {
					request.post({
						"rejectUnauthorized": false, 
						 headers: jsonHeader,
						url:     apiURL,
						body:JSON.stringify({
							'method': "getvehicledetails",
							'id': v.VehicleId
						})
					}, function(error, response, body){

						//if vehicle doesnt exist in retail add the ID of the vehicle
						//otherwise empty
						if(JSON.parse(body).code != "1"){
							vehicles[index].Status = 0;
							resolve(vehicles[index].VehicleId);
						}
						else{
							resolve('');
						}
						
					});
				}));
			});

			//check all results of promises
			Promise.all(vehicleChecker)
       		.then((ids) => {				
				if(ids.length > 0){
					let updates = [];
					ids.forEach((id, index) => {
						if(id != ''){
							updates.push(updateVehicle(vehicles[index], 1));
						}						
					});
					Promise.all(updates)
					.then(() => {
						console.log("Record Status Updated");
					});
				}	
				console.log(vehicles);
				res.send(vehicles);
			});
		}
	});
});

app.get('/getactivevehicle', function(req, res){
	getVehicle(req.query.vehicleId, 1)
	.then(vehicle => {
		console.log(vehicle);
		if(vehicle != null){
			res.send(vehicle);
		}
		else{
			console.log("VEHICLE NOT FOUND");
		}
	});
});

app.post('/deletevehicle', function(req, res){
	let data = [];
	console.log(req.body);
	if(req.body != null){
		let vehicleIds = req.body.vehicleIds;
		let CSVType = req.body.CSVType;
		if(vehicleIds != null && vehicleIds.length > 0){
			//iterate vehicles to be deleted
			vehicleIds.forEach(vehicleId => {
				//get the vehicle from json server
				getVehicle(vehicleId, CSVType)
				.then(vehicle => {
					//if vehicle exist
					if(vehicle != null){
						const tempVehicle = vehicle;
						//delete vehicle from JSON server
						deleteVehicle(vehicle.VehicleId, 1)
						.then(delVehicle => {
							tempVehicle.Deleted = (d.getDate() + '/' + (d.getMonth()+1)).toString();
							console.log(tempVehicle);
							res.send(vehicleId);
						});
					}
					else{
						console.log("VEHICLE NOT FOUND " + vehicleId);
					}
			
				});
			});

		}
	}

 
});

app.get('/updatevehicles', function(req, res){
	getVehicles(1)
	.then( vehicles => {
		let data = [];
		let vehicle = null;	
		let vehicleChecker = [];
		let iPromise = 0; 
		let idxSold = "";
		for(var i = 0; i < vehicles.length; i++){
			vehicle = vehicles[i];
			vehicleChecker.push(			
				new Promise(resolve => {
					request.post({
						"rejectUnauthorized": false, 
						headers: jsonHeader,
						url:     apiURL,
						body:JSON.stringify({
							'method': "getvehicledetails",
							'id': vehicle.VehicleId
						})
					}, function(error, response, body, request){
					if(JSON.parse(body).code != "1"){
						var id = JSON.parse(response.request.body).id;
						idxSold += id + " ";
					}
					resolve('');
				});
			}));			
		}
		
		Promise.all(vehicleChecker)
		.then((x) => {		
		vehicles.forEach(item => {
			if(idxSold.indexOf(item.VehicleId) != -1){
				item.Status = 0;
				updateVehicle(item, 1);
			}
			data.push([item.VehicleId, 
				item.Name, 
				item.Specs.replace(",", ""), 
				item.Status, 
				item.Price, 
				item.View, 
				item.Inquiry, 
				item.Posted, 
				item.Deleted, 
				item.URL, 
				item.FBUser]);
			
		});		
		 res.send(data);
	 });
	});
});

app.get('/addvehicle', function(req, res){
	addActiveVehicle(req.query.vehicleId, 1, req.query.fbUser)
	.then(addVehicle => {
		console.log("Added Successfully");
		console.log(addVehicle);
		res.send(req.query.vehicleId);
	}, 
	error => {
		res.send('0');
	});

});

app.get('/saveactivevehicles', function(req, res){
	getSaveVehicles(1);
});

/* GraphQL Promise **/
function getVehicles(tempCSVType){
	return new Promise(resolve => {
		const CSVType = tempCSVType;
		request.post({
			"rejectUnauthorized": false, 
			headers: jsonHeader,
			url:     graphQLUrl,
			body:JSON.stringify(
				{
					query: `query($CSVType: Int){ 
						GetVehicles(CSVType: $CSVType) 
						{ 
							VehicleId,
							Name,
							Specs,
							Status,
							Price,
							View,
							Inquiry,
							Posted,
							Deleted,
							URL,
							FBUser
						}
					}`, 
					variables: {CSVType: CSVType}, 
					operationName: null
				})
			}, function(error, response, body){
				console.log("GET VEHICLES");
				console.log(body);
				resolve(JSON.parse(body).data.GetVehicles);		
			}
		);
	});
}

function getVehicle(VehicleId, CSVType){
	return new Promise((resolve) => {
		request.post({
			"rejectUnauthorized": false, 
			headers: jsonHeader,
			url:     graphQLUrl,
			body:JSON.stringify(
				{
					query: `query($VehicleId:String!, $CSVType: Int)
							{
								GetVehicle(VehicleId: $VehicleId, CSVType:$CSVType)
								{ 
									VehicleId,
									Name,
									Specs,
									Status,
									Price,
									View,
									Inquiry,
									Posted,
									Deleted,
									URL,
									FBUser	 
								}
							}`, 
					variables: 
					{
						VehicleId: VehicleId,
						CSVType: CSVType
					}, 
					operationName: null
				})
			}, function(error, response, body){
				console.log("GET VEHICLE");
				if(JSON.parse(body).data == null){
					resolve(null);
				}
				else{
					resolve(JSON.parse(body).data.GetVehicle);
				}
				
			}
		);
	});
}

function deleteVehicle(VehicleId, CSVType){
	return new Promise(resolve => {
		request.post({
			"rejectUnauthorized": false, 
			headers: jsonHeader,
			url:     graphQLUrl,
			body:JSON.stringify(
				{
					query:`mutation($VehicleId:String!, $CSVType: Int) 
						{
							DeleteVehicle(VehicleId: $VehicleId, CSVType: $CSVType) 
							{
								VehicleId,
								Name,
								Specs,
								Status,
								Price,
								View,
								Inquiry,
								Posted,
								Deleted,
								URL,
								FBUser
							}
					  }`, 
					variables: 
					{
						VehicleId:VehicleId,
						CSVType:CSVType
					}, 
					operationName: null
				})
			}, function(error, response, body){
				let tempVehicle = JSON.parse(body).data.DeleteVehicle;
				console.log("Vehicle Deleted");
				console.log(body);
				resolve(tempVehicle);
			}
		);	
	});

}

function updateVehicle(vehicle, CSVType){
	return new Promise(resolve => {
		request.post({
			"rejectUnauthorized": false, 
			headers: jsonHeader,
			url:     graphQLUrl,
			body:JSON.stringify(
				{
					query:`mutation($VehicleId:String!,$Name:String,$Specs:String,$Status:Int,$Price:Int,$View:Int,$Inquiry:Int,$Posted:String,$Deleted:String,$URL:String,$FBUser:String, $CSVType:Int) 
						{
							UpdateVehicle(
							VehicleId: $VehicleId,	
							Name: $Name,
							Specs: $Specs,
							Status: $Status,
							Price: $Price,
							View: $View,
							Inquiry: $Inquiry,
							Posted: $Posted,
							Deleted: $Deleted,
							URL: $URL,
							FBUser: $FBUser,
							CSVType: $CSVType				  
							) {
							VehicleId
							}
						}`, 
					variables: 
					{
						VehicleId:vehicle.VehicleId,
						Name: vehicle.Name,
						Specs: vehicle.Specs,
						Status: vehicle.Status,
						Price: vehicle.Price,
						View: vehicle.View,
						Inquiry: vehicle.Inquiry,
						Posted: vehicle.Posted,
						Deleted: vehicle.Deleted,
						URL: vehicle.URL,
						FBUser: vehicle.FBUser,
						CSVType: CSVType
					}, 
					operationName: null
				})
			}, function(error, response, body){
				let tempVehicle = JSON.parse(body).data.UpdateVehicle;
				console.log(body);
				resolve(tempVehicle);
			}
		);	
	});

}

function addDeleteVehicle(deletedVehicle, CSVType){
	return new Promise(resolve => {
		let vehicle = deletedVehicle;
		console.log(vehicle);
		request.post({
			"rejectUnauthorized": false, 
			headers: jsonHeader,
			url:     graphQLUrl,
			body:JSON.stringify(
				{
					query:`mutation($VehicleId:String!,$Name:String,$Specs:String,$Status:Int,$Price:Int,$View:Int,$Inquiry:Int,$Posted:String,$Deleted:String,$URL:String,$FBUser:String, $CSVType:Int) 
						{
							AddVehicle(
							VehicleId: $VehicleId,	
							Name: $Name,
							Specs: $Specs,
							Status: $Status,
							Price: $Price,
							View: $View,
							Inquiry: $Inquiry,
							Posted: $Posted,
							Deleted: $Deleted,
							URL: $URL,
							FBUser: $FBUser,
							CSVType: $CSVType				  
							) {
							VehicleId
							}
						}`, 
					variables: 
					{
						VehicleId:vehicle.VehicleId,
						Name: vehicle.Name,
						Specs: vehicle.Specs,
						Status: vehicle.Status,
						Price: vehicle.Price,
						View: vehicle.View,
						Inquiry: vehicle.Inquiry,
						Posted: vehicle.Posted,
						Deleted: vehicle.Deleted,
						URL: vehicle.URL,
						FBUser: vehicle.FBUser,
						CSVType: CSVType
					}, 
					operationName: null
				})
			}, function(error, response, body){
				console.log(body);
				resolve(body);
			}
		);
	});
}

function addActiveVehicle(vehicleId, CSVType, fbUser){
	return new Promise((resolve, reject) => {
		request.post({
			"rejectUnauthorized": false, 
			 headers: jsonHeader,
			url:     apiURL,
			body:JSON.stringify({
				'method': "getvehicledetails",
				'id': vehicleId
			})
		}, function(error, response, body){
			console.log("Get Details");
			console.log(body);

			if(JSON.parse(body).code == "1"){
				getVehiclePrice(vehicleId).then(vehiclePrice => {
					let fbuser = "Samuel";
					let vehicle = JSON.parse(body).VehicleDetails;
					let specs = (getFieldObject(vehicle.Fields, "Odometer") + '/' +
					getFieldObject(vehicle.Fields, "Transmission") + '/' +
					getFieldObject(vehicle.Fields, "CC Rating") + '/' +
					getFieldObject(vehicle.Fields, "Fuel Type")).toString();		
					request.post({
						"rejectUnauthorized": false, 
						headers: jsonHeader,
						url:     graphQLUrl,
						body:JSON.stringify(
							{
								query:`mutation($VehicleId:String!,$Name:String,$Specs:String,$Status:Int,$Price:Int,$View:Int,$Inquiry:Int,$Posted:String,$Deleted:String,$URL:String,$FBUser:String, $CSVType:Int) 
									{
										AddVehicle(
										VehicleId: $VehicleId,	
										Name: $Name,
										Specs: $Specs,
										Status: $Status,
										Price: $Price,
										View: $View,
										Inquiry: $Inquiry,
										Posted: $Posted,
										Deleted: $Deleted,
										URL: $URL,
										FBUser: $FBUser,
										CSVType: $CSVType				  
										) {
										VehicleId
										}
									}`, 
								variables: 
								{
									VehicleId:vehicle.Id,
									Name: (`${vehicle.Year} ${vehicle.ManufacturerName} ${vehicle.ModelName} ${vehicle.ModelVariantName==null?' ':vehicle.ModelVariantName}`),
									Specs: specs,
									Status: 1,
									Price: vehiclePrice,
									View: 0,
									Inquiry: 0,
									Posted: (d.getDate() + '/' + (d.getMonth()+1)).toString(),
									Deleted: "None",
									URL: `${preUrl + vehicle.Id}`,
									FBUser: fbUser,
									CSVType: CSVType
								}, 
								operationName: null
							})
						}, function(error, response, body){
							console.log(body);
							resolve(body);
							//getSaveVehicles();
						}
					);
				});
			}
			else{
				console.log("Vehicle NOT FOUND");
				reject("Vehicle NOT FOUND");
			}
		});
	});
}

function getSaveVehicles(CSVType){

	getVehicles(CSVType)
	.then( vehicles => {
		let data = [];
		var vehicle = null;	
		for(var i = 0; i < vehicles.length; i++){
			vehicle = vehicles[i];
			data.push([vehicle.VehicleId, 
			vehicle.Name, 
			vehicle.Specs.replace(",", ""), 
			vehicle.Status, 
			vehicle.Price, 
			vehicle.View, 
			vehicle.Inquiry, 
			vehicle.Posted, 
			vehicle.Deleted, 
			vehicle.URL, 
			vehicle.FBUser]);
		}
		writeCSVFile(data, columns, CSVType==1?activevehicles:notactivevehicles);

	});

}

function getVehiclePrice(vehicleId){	
	return new Promise(resolve => {
		request.post({
			"rejectUnauthorized": false, 
			 headers: jsonHeader,
			url:     apiURL,
			body:JSON.stringify({
				'method': "setvehiclepricing",
				'id': vehicleId,
				'onLoad':1
			})
		}, function(error, response, body){
			console.log("Set Pricing");
			const pricing = JSON.parse(body).VehiclePricing.MakeOfferObject;
			console.log(pricing.CurrentPriceMin);
			resolve(pricing.CurrentPriceMin);
		});
	});

}

/* Utility Functions **/

function getFieldObject(fields, key){
	for(let idx = 0; idx < fields.length; idx++){
	  let tempKey = Object.keys(fields[idx]);
	  if(tempKey[0] == key){
		return fields[idx][key].toString().replace("\"", "");
	  }
	}
}

function writeCSVFile(data, columns, csvFileName){
	
	stringify(data, { header: true, columns: columns, quote: '' }, (err, output) => {
		if (err) throw err;
		let timeStamp = `${d.getDay()}-${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
		fs.stat(csvFileName, function (err, stats) {	 
			if (err) {
				fs.writeFile(csvFileName, output, function(err) {
					if(err) {
						return console.log(err);
					}	
					console.log(`${csvFileName} was saved! ${timeStamp}`);
				}); 
			}
			else{
				fs.unlink(csvFileName,function(err){
					if(err) return console.log(err);
					console.log(`${csvFileName} deleted successfully ${timeStamp}`);
   
					fs.writeFile(csvFileName, output, function(err) {
					   if(err) {
						   return console.log(err);
					   }	
					   console.log(`${csvFileName} was saved! ${timeStamp}`);
				   }); 
			   });  
			} 

		 });
	});	
}

app.listen('8085', function () {
    console.log("Express server listening on port 8085");
});
exports = module.exports = app;
