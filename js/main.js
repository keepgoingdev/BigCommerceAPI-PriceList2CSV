var api_url = "http://mysmsservice.com/vendor/StorePriceListAPI.php";
var csv_header_names = [
	"Variant ID",
	"SKU Code",
	"Currency",
	"Price",
	"Sale Price",
	"Retail Price",
	"MAP",
	"Bulk Tier Min - 1",
	 "Bulk Tier Max - 1",
	"Bulk Pricing Type - 1",
	"Bulk Pricing Value - 1",
	"Bulk Tier Min - 2",
	 "Bulk Tier Max - 2",
	"Bulk Pricing Type - 2",
	 "Bulk Pricing Value - 2",
	 "Bulk Tier Min - 3",
	 "Bulk Tier Max - 3",
	"Bulk Pricing Type - 3",
	"Bulk Pricing Value - 3"
];
var temp_error_rows = [];
var temp_row_index = 0;
var app = new Vue({
  el: '#app',
  data: {
    priceLists: [],
    priceListsName: {},
    newPriceListname: ""
  },
  methods: {
    onCreatePriceList: function () {
      
    	const rows = [["name1", "city1", "some other info"], ["name2", "city2", "more info"]];
		let csvContent = "data:text/csv;charset=utf-8,";
		rows.forEach(function(rowArray){
   			let row = rowArray.join(",");
   			csvContent += row + "\r\n";
		});

		var encodedUri = encodeURI(csvContent);
		var link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "my_data.csv");
		document.body.appendChild(link); // Required for FF
		link.click();
    },

    onUpdatePriceList: function(priceListID){
    	var file = $("#fileInput" + priceListID)[0].files[0];
    	//updatePriceListBatchFromFile(priceListID, file);
    	updatePriceListOneByOneFromFile(priceListID, file);
    },

    onExportPriceListToCSV: function(priceListID){
    	//Request Records of Price List
    	axios.post(api_url, {
	    			"mode": "3",
	    			"id" : priceListID,
	  		})
			.then(function (response) {
	    			
	    		var records = response.data.data;		//records of the priceLists
	    		exportPriceListToCSV(priceListID, records);
			})
			.catch(function (error) {
	 	   		console.log(error);
			});
    },

    onCreateNewPriceList: function(){
    	if(app.newPriceListname == "")
    		alert("Input new priceList name!");
    	axios.post(api_url, { "mode" : "4" , "name" : app.newPriceListname} )
	    	.then(function(response){
	     		result = response.data;
	     		if(result.status)
	     			alert(result.errors.name);
	     		else
	     		{
	     			//Update PriceLists
	     			getPriceLists();

	     			//Update Records from file
	     			var file = $("#newPriceListFile")[0].files[0];
	     			//updatePriceListBatchFromFile(result.data.id, file);
	     			updatePriceListOneByOneFromFile(result.data.id, file);
	     		}
	    	})
	    	.catch(function(error){
	      		console.log(error);
			});
    	}
  }
});

getPriceLists();

function getPriceLists()
{
	app.priceLists = [];
	axios.post(api_url, { "mode" : "1" } )
	    .then(function(response){
	     	app.priceLists = response.data.data;
	     	app.priceLists.forEach(function(item){		//Save each price list name
	     		app.priceListsName[item.id] = item.name;
	     	});
	    })
	    .catch(function(error){
	      console.log(error);
	});
}
function makePrettyJsonContent(data)
{
	var jsonContent = [];
	for(i = 1; i < data.length; i++)
	{
		var record = {};
		record['variant_id'] = data[i][0];
		record['sku'] = data[i][1];
		record['currency'] = data[i][2];
		record['price'] = data[i][3];
		record['sale_price'] = data[i][4];
		record['retail_price'] = data[i][5];
		record['map_price'] = data[i][6];
		record['bulk_pricing_tiers'] = [];

		var bulk_pricing_tiers_count = (data[i].length - 7) / 4;

		for(j = 0; j < bulk_pricing_tiers_count; j++)
		{		
			var bulk_pricing_entry = {
				"quantity_min": data[i][7 + j * 4],
	        	"quantity_max": data[i][7 + j * 4 + 1],
	        	"type": data[i][7 + j * 4 + 2],
	        	"amount": data[i][7 + j * 4 + 3]
			};
			if(bulk_pricing_entry['quantity_min'] != 0 || bulk_pricing_entry['quantity_max']
				|| bulk_pricing_entry['type'] != "" || bulk_pricing_entry['amount'] != 0)
				record['bulk_pricing_tiers'].push(bulk_pricing_entry);
		}
		jsonContent.push(record);
	}
	return jsonContent;
}

function updatePriceListBatchFromFile(priceListID, file)
{
    if(file)
	{
        Papa.parse(file, {skipEmptyLines: true, complete: function(response){
			
			//Update Price List
			axios.post(api_url, {
    			"mode": "2",
    			"id" : priceListID,
    			"content" : makePrettyJsonContent(response.data)
  			})
			.then(function (res) {
    			if(res.data.status)
    				alert(res.data.errors.name);
    			else
    				alert("Successfully done!");
			})
			.catch(function (error) {
 	   			console.log(error);
			});

		}});
	}
}

function updatePriceListOneByOneFromFile(priceListID, file)
{
    if(file)
	{
        Papa.parse(file, {skipEmptyLines: true, complete: function(response){
			
			var jsonRecords = makePrettyJsonContent(response.data);

			temp_error_rows = [];
			temp_row_index = 0;
			for(i = 0; i < jsonRecords.length; i++)
			{
				var record = jsonRecords[i];
				next(record, priceListID, jsonRecords.length);
			}

		}});
	}
}

function next(record, priceListID, length) {
	axios.post(api_url, {
		"mode": "5",
		"id" : priceListID,
		"record" : record
		})
	.then(function (res) {

		if(res.data.status)
		{
			temp_error_rows.push(record);
		}
		temp_row_index++;
		if(temp_row_index == length)
		{
			exportPriceListToCSV(priceListID, temp_error_rows, true);
			alert("Successfully Done! Error Records Downloaded");
		}
	})
	.catch(function (error) {
   			console.log(error);
	});
}

function exportPriceListToCSV(priceListID, records, isErrorRows)
{
	var jsonContent = [];
	jsonContent.push(csv_header_names);			//JsonContent for CSV, initialize with heards
	
	records.forEach(function(record){		//Insert each record to jsonContetn as proper format
		var newRow = [record.variant_id,
			record.sku,
			record.currency,
			record.price,
			record.sale_price,
			record.retail_price,
			record.map_price,];
			for(i = 0; i < 3; i++)
			{
				if(record.bulk_pricing_tiers[i])
					newRow.push(
						record.bulk_pricing_tiers[i].quantity_min,
						record.bulk_pricing_tiers[i].quantity_max,
						record.bulk_pricing_tiers[i].type,
						record.bulk_pricing_tiers[i].amount);
				else
					newRow.push(null, null, null, null);

			}
		jsonContent.push(newRow);
	});

	let csvContent = "data:text/csv;charset=utf-8,";
	csvContent += Papa.unparse(jsonContent);
	var encodedUri = encodeURI(csvContent);
	var link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	if(isErrorRows == true)
		link.setAttribute("download", app.priceListsName[priceListID] + "(Error Records).csv");
	else
		link.setAttribute("download", app.priceListsName[priceListID] + ".csv");
	document.body.appendChild(link); // Required for FF
	link.click();
}