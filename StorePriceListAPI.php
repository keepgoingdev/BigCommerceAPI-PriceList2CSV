<?php
// Allow from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // should do a check here to match $_SERVER['HTTP_ORIGIN'] to a
    // whitelist of safe domains
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}
// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");         

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

}

//Initialize Store API
$api_root_url = "https://api.bigcommerce.com/stores/phn6crmhc5/v3/";

$ch = curl_init();

curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt($ch, CURLOPT_HEADER, FALSE);

curl_setopt($ch, CURLOPT_HTTPHEADER, array(
  "Accept: application/json",
  "Content-Type: application/json",
  "X-Auth-Client:". $client_id,
  "X-Auth-Token:".$client_token
));

$_POST = json_decode(file_get_contents('php://input'), true);
$mode = $_POST['mode'];

if($mode == 1)	//Get Price List Collection
{
	curl_setopt($ch, CURLOPT_URL, $api_root_url."pricelists");
	$response = curl_exec($ch);
	curl_close($ch);
	echo($response);
}
else if($mode == 2)		//Update Price List Collection
{
	$priceListId = $_POST['id'];
	$priceListContent = $_POST['content'];
	
	$recordsStr = makePrettyRecordsContent($priceListContent);

	curl_setopt($ch, CURLOPT_URL, $api_root_url . "pricelists/" . $priceListId . "/records");
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
	curl_setopt($ch, CURLOPT_POSTFIELDS, $recordsStr);
	$response = curl_exec($ch);
	curl_close($ch);
	echo($response);
}

else if($mode == 3)		//Return Records of Selected pricelist
{
	$priceListId = $_POST['id'];
	curl_setopt($ch, CURLOPT_URL, $api_root_url."pricelists/" . $priceListId . "/records?include=bulk_pricing_tiers,sku");
	$response = curl_exec($ch);
	curl_close($ch);
	echo($response);
}

else if($mode == 4)		//Create PriceList with
{
	$priceListName = $_POST['name'];
	curl_setopt($ch, CURLOPT_URL, $api_root_url . "pricelists");
	curl_setopt($ch, CURLOPT_POST, TRUE);
	curl_setopt($ch, CURLOPT_POSTFIELDS, "{
	  \"name\": \"" . $priceListName . "\",
	  \"active\": true
	}");

	$response = curl_exec($ch);
	curl_close($ch);
	echo $response;
}

else if($mode == 5)	//Create or Update Single Price List
{
	$priceListId = $_POST['id'];
	$jsonRecord = $_POST['record'];
	$recordStr = makePrettySingleRecord($jsonRecord, false);

	curl_setopt($ch, CURLOPT_URL, $api_root_url . "pricelists/" . $priceListId . "/records/" . $jsonRecord['variant_id'] . "/" . $jsonRecord['currency']);
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
	curl_setopt($ch, CURLOPT_POSTFIELDS, $recordStr);

	$response = curl_exec($ch);
	curl_close($ch);
	echo $response;
}

function makePrettyRecordsContent($data)
{
	$res = "[";
	$count = count($data);
	for($i = 0; $i < $count; $i++)
	{
		$res .= makePrettySingleRecord($data[$i], true);
		if($i == $count - 1)
			$res .= "";
		else
			$res .= ",";
	}
	$res .= "\n]";

	return $res;
}

function makePrettySingleRecord($data, $isForBatch)
{
	$res = "\n{";
	//$res .= sprintf("\n\"variant_id\": %s,", $data['variant_id']);
	if($isForBatch)
		$res .= sprintf("\n\"sku\": \"%s\",", $data['sku']);
	if($isForBatch)	
		$res .= sprintf("\n\"currency\": \"%s\",", $data['currency']);
	$res .= sprintf("\n \"price\": %u", $data['price']);
	if($data['sale_price'] != 0)
		$res .= sprintf(",\n\"sale_price\": %u", $data['sale_price']);
	if($data['map_price'] != 0)
		$res .= sprintf(",\n\"map_price\": %u", $data['map_price']);
	if($data['retail_price'] != 0)
		$res .= sprintf(",\n\"retail_price\": %u", $data['retail_price']);
	
	if(count($data['bulk_pricing_tiers']) > 0)
	{

		$res .= ",\n\"bulk_pricing_tiers\" : [";
		for($j = 0;  $j < count($data['bulk_pricing_tiers']); $j++)
		{
			$res .= "\n{";
			$res .= sprintf("\n\"quantity_min\": %u,", $data['bulk_pricing_tiers'][$j]['quantity_min']);
			$res .= sprintf("\n\"quantity_max\": %u,", $data['bulk_pricing_tiers'][$j]['quantity_max']);
			$res .= sprintf("\n\"type\": \"%s\",", $data['bulk_pricing_tiers'][$j]['type']);
			$res .= sprintf("\n\"amount\": %u", $data['bulk_pricing_tiers'][$j]['amount']);
			if($j == count($data['bulk_pricing_tiers']) - 1)
				$res .= "\n}";
			else
				$res .= "\n},";
		}
		$res .= "\n]";
	}
	$res .= "\n}";
	return $res;
}