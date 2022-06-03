<?php

@define (HttpRequestParameterAddress, "address");
@define (HttpContentTypeBase64, "X-user/base64-data");

@define (UseProxy, false);
@define (ProxyAddress, "");
@define (ProxyPort, "3128");
@define (ProxyLoginPassword, "username:password");

$sKnownHosts = array(
	"czo.gov.ua",
	"zc.bank.gov.ua",
	"acskidd.gov.ua",
	"ca.informjust.ua",
	"csk.uz.gov.ua",
	"masterkey.ua",
	"ocsp.masterkey.ua",
	"tsp.masterkey.ua",
	"csk.uss.gov.ua",
	"csk.ukrsibbank.com",
	"acsk.privatbank.ua",
	"ca.mil.gov.ua",
	"acsk.dpsu.gov.ua",
	"acsk.er.gov.ua",
	"ca.mvs.gov.ua",
	"canbu.bank.gov.ua",
	"uakey.com.ua",
	"altersign.com.ua",
	"ca.altersign.com.ua",
	"ocsp.altersign.com.ua",
	"acsk.treasury.gov.ua",
	"ocsp.treasury.gov.ua",
	"ca.oschadbank.ua",
	"ca.gp.gov.ua",
	"acsk.oree.com.ua",
	"ca.treasury.gov.ua",
	"ca.depositsign.com",
	"csk.pivdenny.ua",
	"xca.credit-agricole.com.ua",
	"ca.iit.com.ua",
	"ca.tascombank.com.ua",
	"ssign.informjust.ua",
	"depositsign.com",
	"pki.pumb.ua",
	"ca.alfabank.kiev.ua",
	"cesaris.itsway.kiev.ua",
	"ca.credit-agricole.ua"
);

function is_known_host($value) {
	if (!filter_var($value, FILTER_VALIDATE_URL))
		return false;

	$aUrl = parse_url($value);
	if (is_null($aUrl) or !$aUrl) {
		return false;
	}
	
	if ($aUrl['scheme'] != 'http' && 
		$aUrl['scheme'] != 'https') {
		return false;
	}

	foreach ($GLOBALS["sKnownHosts"] as $sKnownHost) {
		if ($aUrl['host'] == $sKnownHost)
			return true;
	}

	return false;
}

function get_content_type($value) {
	$sPath = parse_url($value, PHP_URL_PATH);
	if (is_null($sPath) or !$sPath)
		return 'text/plain';

	if (strpos($sPath, '/cloud/api/back/') !== false) {
		return 'application/json';
	}

	switch ($sPath) {
		case '/services/cmp':
		case '/public/x509/cmp':
		case '/cmp':
			return '';

		case '/services/ocsp':
		case '/services/ocsp/':
		case '/public/ocsp':
		case '/ocsp':
		case '/ocsp-rsa':
		case '/ocsp-ecdsa':
		case '/OCSPsrv/ocsp':
		case '/queries/ocsp/':
			return 'application/ocsp-request';

		case '/services/tsp':
		case '/services/tsp/':
		case '/services/tsp/rsa':
		case '/services/tsp/ecdsa':
		case '/public/tsa':
		case '/tsp':
		case '/tsp-rsa':
		case '/tsp-ecdsa':
		case '/TspHTTPServer/tsp':
			return 'application/timestamp-query';

		default:
			return 'text/plain';
	}
}

function convert_bytes($value) {
	if (is_numeric($value)) {
		return $value;
	} else {
		$value_length = strlen($value);
		$qty = substr($value, 0, $value_length - 1);
		$unit = strtolower(substr($value, $value_length - 1 ));
		switch ($unit) {
			case 'k':
				$qty *= 1024;
				break;
			case 'm':
				$qty *= 1024 * 1024;
				break;
			case 'g':
				$qty *= 1024* 1024 * 1024;
				break;
		}
		return $qty;
	}
}

function handle_request($requestMethod) {
	$sAddress = NULL;
	$sContent = NULL;
	$sServerRequest = NULL;
	$sResponse = NULL;
	$sError;

	if ($requestMethod == 'POST') {
		$postMaxSize = convert_bytes(ini_get('post_max_size'));
		if ($_SERVER['CONTENT_LENGTH'] > $postMaxSize) {
			return 'HTTP/1.0 413 Request Entity Too Large';
		}

		$sContent = file_get_contents('php://input');
		$sServerRequest = base64_decode($sContent);
	}

	$sAddress = @$_GET[HttpRequestParameterAddress];
	if(empty($sAddress)) {
		return 'HTTP/1.0 400 Bad Request';
	}

	if (!is_known_host($sAddress)) {
		return 'HTTP/1.0 403 Forbidden';
	}

	$ch = curl_init();

	curl_setopt($ch, CURLOPT_URL, $sAddress);
	curl_setopt($ch, CURLOPT_HEADER, 1);
	curl_setopt($ch, CURLINFO_HEADER_OUT, 1);
	curl_setopt($ch, CURLOPT_FAILONERROR, 0);
	curl_setopt($ch, CURLOPT_PROTOCOLS, 
		CURLPROTO_HTTP | CURLPROTO_HTTPS);
	curl_setopt($ch, CURLOPT_USERAGENT, "signature.proxy");
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $requestMethod);

	if (UseProxy) {
		curl_setopt($ch, CURLOPT_PROXY, ProxyAddress);
		curl_setopt($ch, CURLOPT_PROXYPORT, ProxyPort);
		curl_setopt($ch, CURLOPT_PROXYTYPE, 'HTTP');
		curl_setopt($ch, CURLOPT_PROXYUSERPWD, ProxyLoginPassword);
	}

	$headers = array(
		'Content-Type: '.get_content_type($sAddress),
	);

	//curl_setopt($ch, CURLOPT_SAFE_UPLOAD, true); // Set only for PHP = 5.5
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS,$sServerRequest);

	$response = curl_exec($ch);

	$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
	$header = explode(PHP_EOL,trim(substr($response, 0, $header_size)));
	$sResponse = substr($response, $header_size);

	if (!isset($sResponse) || $sResponse=='') {
		return 'HTTP/1.0 500 Internal Server Error';
	}

	header("Content-type: " . HttpContentTypeBase64 . "; charset=utf-8");
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	echo base64_encode($sResponse);

	return '';
}

$sStatus = NULL;

try {
	$sRequestMethod = $_SERVER['REQUEST_METHOD'];
	if ($sRequestMethod == 'GET' || $sRequestMethod == 'POST') {
		$sStatus = handle_request($sRequestMethod);
	} else {
		$sStatus = 'HTTP/1.0 400 Bad Request';
	}
} catch (Exception $e) {
	$sStatus = 'HTTP/1.0 500 Internal Server Error';
	echo $e;
}

if ($sStatus != '') {
	header('Content-Type: text/html; charset=utf-8');
	header($sStatus);
	echo 'Виникла помилка при обробці запиту';
	exit;
}
