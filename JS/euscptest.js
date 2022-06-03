//=============================================================================

var URL_EMAIL_PARAM = "@EMAIL_PARAM";
var URL_GET_KEP_CERTIFICATE_BY_EMAIL = "http://ca.iit.com.ua/services-cmp-getcert?eUserEMail=" +
	URL_EMAIL_PARAM + "&certType=2&respType=2";

var URL_GET_CERTIFICATES = "/Data/CACertificates.p7b?version=1.0.19";
var URL_CAS = "/Data/CAs.json?version=1.0.19";
var URL_XML_HTTP_PROXY_SERVICE = "/Server/ProxyHandler.php";

//=============================================================================

var SubjectCertTypes = [
	{ "type": EU_SUBJECT_TYPE_UNDIFFERENCED, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_UNDIFFERENCED },
	{ "type": EU_SUBJECT_TYPE_CA, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_UNDIFFERENCED },
	{ "type": EU_SUBJECT_TYPE_CA_SERVER, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_UNDIFFERENCED },
	{ "type": EU_SUBJECT_TYPE_CA_SERVER, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_CMP },
	{ "type": EU_SUBJECT_TYPE_CA_SERVER, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_OCSP },
	{ "type": EU_SUBJECT_TYPE_CA_SERVER, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_TSP },
	{ "type": EU_SUBJECT_TYPE_END_USER, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_UNDIFFERENCED },
	{ "type": EU_SUBJECT_TYPE_RA_ADMINISTRATOR, "subtype": EU_SUBJECT_CA_SERVER_SUB_TYPE_UNDIFFERENCED }
];

var CertKeyTypes = [
	EU_CERT_KEY_TYPE_UNKNOWN,
	EU_CERT_KEY_TYPE_DSTU4145,
	EU_CERT_KEY_TYPE_RSA,
	EU_CERT_KEY_TYPE_ECDSA
];

var KeyUsages = [
	EU_KEY_USAGE_UNKNOWN,
	EU_KEY_USAGE_DIGITAL_SIGNATURE,
	EU_KEY_USAGE_KEY_AGREEMENT
];

var CAdESTypes = [
	EU_SIGN_TYPE_CADES_BES,
	EU_SIGN_TYPE_CADES_T,
	EU_SIGN_TYPE_CADES_C,
	EU_SIGN_TYPE_CADES_X_LONG,
	EU_SIGN_TYPE_CADES_X_LONG | EU_SIGN_TYPE_CADES_X_LONG_TRUSTED
];

//=============================================================================

var EUSignCPTest = NewClass({
	"Vendor": "JSC IIT",
	"ClassVersion": "1.0.0",
	"ClassName": "EUSignCPTest",
	"CertsLocalStorageName": "Certificates",
	"CRLsLocalStorageName": "CRLs",
	"recepientsCertsIssuers": null,
	"recepientsCertsSerials": null,
	"PrivateKeyNameSessionStorageName": "PrivateKeyName",
	"PrivateKeySessionStorageName": "PrivateKey",
	"PrivateKeyPasswordSessionStorageName": "PrivateKeyPassword",
	"PrivateKeyCertificatesSessionStorageName": "PrivateKeyCertificates",
	"PrivateKeyCertificatesChainSessionStorageName": "PrivateKeyCertificatesChain",
	"CACertificatesSessionStorageName": "CACertificates",
	"CAServerIndexSessionStorageName": "CAServerIndex",
	"CAsServers": null,
	"CAServer": null,
	"offline": false,
	"useCMP": false,
	"loadPKCertsFromFile": false,
	"privateKeyCerts": null
},
	function () {
	},
	{

		// ІНІЦІАЛІЗАЦІЯ БІБЛІОТЕКИ ****************************************************************************************************

		initialize: function () {
			setStatus('ініціалізація');

			var _onSuccess = function () {
				try {
					euSign.Initialize();
					euSign.SetJavaStringCompliant(true);
					euSign.SetCharset("UTF-16LE");

					euSign.SetRuntimeParameter(
						EU_MAKE_PKEY_PFX_CONTAINER_PARAMETER, true);

					if (euSign.DoesNeedSetSettings()) {
						euSignTest.setDefaultSettings();

						if (utils.IsStorageSupported()) {
							// euSignTest.loadCertsAndCRLsFromLocalStorage();
						} else {
							document.getElementById(
								'SelectedCertsList').innerHTML =
								"Локальне сховище не підтримується";
							document.getElementById(
								'SelectedCRLsList').innerHTML =
								"Локальне сховище не підтримується";
						}
					}

					euSignTest.loadCertsFromServer();
					euSignTest.setCASettings(0);

					euSignTest.setSelectPKCertificatesEvents();

					if (utils.IsSessionStorageSupported()) {
						var _readPrivateKeyAsStoredFile = function () {
							euSignTest.readPrivateKeyAsStoredFile();
						}
						setTimeout(_readPrivateKeyAsStoredFile, 10);
					}

					euSignTest.updateCertList();

					setStatus('');
				} catch (e) {
					setStatus('не ініціалізовано');
					alert(e);
				}
			};

			var _onError = function () {
				setStatus('Не ініціалізовано');
				alert('Виникла помилка ' +
					'при завантаженні криптографічної бібліотеки');
			};

			euSignTest.loadCAsSettings(_onSuccess, _onError);
		},

		//@@@ ****************************************************************************************************

		loadCAsSettings: function (onSuccess, onError) {
			var pThis = this;

			var _onSuccess = function (casResponse) {
				try {
					var servers = JSON.parse(casResponse.replace(/\\'/g, "'"));

					var select = document.getElementById("CAsServersSelect");
					for (var i = 0; i < servers.length; i++) {
						var option = document.createElement("option");
						option.text = servers[i].issuerCNs[0];
						select.add(option);
					}

					var option = document.createElement("option");
					option.text = "інший";
					select.add(option);

					select.onchange = function () {
						pThis.setCASettings(select.selectedIndex);
					};

					pThis.CAsServers = servers;

					onSuccess();
				} catch (e) {
					onError();
				}
			};

			euSign.LoadDataFromServer(URL_CAS, _onSuccess, onError, false);
		},

		//@@@ ****************************************************************************************************

		loadCertsFromServer: function () {
			var certificates = utils.GetSessionStorageItem(
				euSignTest.CACertificatesSessionStorageName, true, false);
			if (certificates != null) {
				try {
					euSign.SaveCertificates(certificates);
					euSignTest.updateCertList();
					return;
				} catch (e) {
					alert("Виникла помилка при імпорті " +
						"завантажених з сервера сертифікатів " +
						"до файлового сховища");
				}
			}

			var _onSuccess = function (certificates) {
				try {
					euSign.SaveCertificates(certificates);
					utils.SetSessionStorageItem(
						euSignTest.CACertificatesSessionStorageName,
						certificates, false);
					euSignTest.updateCertList();
				} catch (e) {
					alert("Виникла помилка при імпорті " +
						"завантажених з сервера сертифікатів " +
						"до файлового сховища");
				}
			};

			var _onFail = function (errorCode) {
				console.log("Виникла помилка при завантаженні сертифікатів з сервера. " +
					"(HTTP статус " + errorCode + ")");
			};

			utils.GetDataFromServerAsync(URL_GET_CERTIFICATES, _onSuccess, _onFail, true);
		},

		//@@@ ****************************************************************************************************

		setDefaultSettings: function () {
			try {
				euSign.SetXMLHTTPProxyService(URL_XML_HTTP_PROXY_SERVICE);

				var settings = euSign.CreateFileStoreSettings();
				settings.SetPath("/certificates");
				settings.SetSaveLoadedCerts(true);
				euSign.SetFileStoreSettings(settings);

				settings = euSign.CreateProxySettings();
				euSign.SetProxySettings(settings);

				settings = euSign.CreateTSPSettings();
				euSign.SetTSPSettings(settings);

				settings = euSign.CreateOCSPSettings();
				euSign.SetOCSPSettings(settings);

				settings = euSign.CreateCMPSettings();
				euSign.SetCMPSettings(settings);

				settings = euSign.CreateLDAPSettings();
				euSign.SetLDAPSettings(settings);

				settings = euSign.CreateOCSPAccessInfoModeSettings();
				settings.SetEnabled(true);
				euSign.SetOCSPAccessInfoModeSettings(settings);

				var CAs = this.CAsServers;
				settings = euSign.CreateOCSPAccessInfoSettings();
				for (var i = 0; i < CAs.length; i++) {
					settings.SetAddress(CAs[i].ocspAccessPointAddress);
					settings.SetPort(CAs[i].ocspAccessPointPort);

					for (var j = 0; j < CAs[i].issuerCNs.length; j++) {
						settings.SetIssuerCN(CAs[i].issuerCNs[j]);
						euSign.SetOCSPAccessInfoSettings(settings);
					}
				}
			} catch (e) {
				alert("Виникла помилка при встановленні налашувань: " + e);
			}
		},

		//@@@ ****************************************************************************************************

		setCASettings: function (caIndex) {
			try {
				var caServer = (caIndex < this.CAsServers.length) ?
					this.CAsServers[caIndex] : null;
				var offline = ((caServer == null) ||
					(caServer.address == "")) ?
					true : false;
				var useCMP = (!offline && (caServer.cmpAddress != ""));
				var loadPKCertsFromFile = (caServer == null) ||
					(!useCMP && !caServer.certsInKey);

				euSignTest.CAServer = caServer;
				euSignTest.offline = offline;
				euSignTest.useCMP = useCMP;
				euSignTest.loadPKCertsFromFile = loadPKCertsFromFile;

				var settings;

				euSignTest.clearPrivateKeyCertificatesList();

				settings = euSign.CreateTSPSettings();
				if (!offline) {
					settings.SetGetStamps(true);
					if (caServer.tspAddress != "") {
						settings.SetAddress(caServer.tspAddress);
						settings.SetPort(caServer.tspAddressPort);
					} else {
						settings.SetAddress('acskidd.gov.ua');
						settings.SetPort('80');
					}
				}
				euSign.SetTSPSettings(settings);

				settings = euSign.CreateOCSPSettings();
				if (!offline) {
					settings.SetUseOCSP(true);
					settings.SetBeforeStore(true);
					settings.SetAddress(caServer.ocspAccessPointAddress);
					settings.SetPort("80");
				}
				euSign.SetOCSPSettings(settings);

				settings = euSign.CreateCMPSettings();
				settings.SetUseCMP(useCMP);
				if (useCMP) {
					settings.SetAddress(caServer.cmpAddress);
					settings.SetPort("80");
				}
				euSign.SetCMPSettings(settings);

				settings = euSign.CreateLDAPSettings();
				euSign.SetLDAPSettings(settings);
			} catch (e) {
				alert("Виникла помилка при встановленні налашувань: " + e);
			}
		},

		//@@@ ****************************************************************************************************

		updateCertList: function () {
			var certSubjType = SubjectCertTypes[0];          // index [0]
			var certKeyType = CertKeyTypes[0];               // index [0]
			var keyUsage = KeyUsages[0];				     // index [0]

			try {
				var index = 0;
				var cert;
				var certs = [];

				while (true) {
					cert = euSign.EnumCertificatesEx(
						certSubjType.type, certSubjType.subtype,
						certKeyType, keyUsage, index);
					if (cert == null)
						break;

					certs.push(cert);
					index++;
				};

				var _makeCertField = function (name, value, addNewLine) {
					return name + ': ' +
						value +
						(addNewLine ? '<br>' : '');
				}

				var certInfos = [];

				for (var i = 0; i < certs.length; i++) {
					var certInfoStr = '';
					var certInfo = certs[i].GetInfoEx();
					var publicKeyType = '';
					switch (certInfo.GetPublicKeyType()) {
						case EU_CERT_KEY_TYPE_DSTU4145:
							publicKeyType += 'ДСТУ-4145';
							break;
						case EU_CERT_KEY_TYPE_RSA:
							publicKeyType += 'RSA';
							break;
						case EU_CERT_KEY_TYPE_ECDSA:
							publicKeyType += 'ECDSA';
							break;
						default:
							publicKeyType = 'Невизначено';
							break;
					}

					certInfoStr += _makeCertField('Власник', certInfo.GetSubjCN(), true);
					certInfoStr += _makeCertField('ЦСК', certInfo.GetIssuerCN(), true);
					certInfoStr += _makeCertField('Серійний номер', certInfo.GetSerial(), true);
					certInfoStr += _makeCertField('Тип', publicKeyType, true);
					certInfoStr += _makeCertField('Призначення', certInfo.GetKeyUsage(), false);

					certInfos.push(certInfoStr);
				}

				// euSignTest.setItemsToList(
				// 	'StorageCertList', certInfos);
			} catch (e) {
				alert("Виникла помилка при " +
					"отриманні сертифікатів з файлового сховища: " + e);
			}
		},

		//@@@ ****************************************************************************************************

		getCAServer: function () {
			var index = document.getElementById("CAsServersSelect").selectedIndex;

			if (index < euSignTest.CAsServers.length)
				return euSignTest.CAsServers[index];

			return null;
		},
		loadCAServer: function () {
			var index = utils.GetSessionStorageItem(
				euSignTest.CAServerIndexSessionStorageName, false, false);
			if (index != null) {
				document.getElementById("CAsServersSelect").selectedIndex =
					parseInt(index);
				euSignTest.setCASettings(parseInt(index));
			}
		},
		storeCAServer: function () {
			var index = document.getElementById("CAsServersSelect").selectedIndex;
			return utils.SetSessionStorageItem(
				euSignTest.CAServerIndexSessionStorageName, index.toString(), false);
		},
		removeCAServer: function () {
			utils.RemoveSessionStorageItem(
				euSignTest.CAServerIndexSessionStorageName);
		},

		//@@@ ****************************************************************************************************

		storePrivateKey: function (keyName, key, password, certificates) {
			if (!utils.SetSessionStorageItem(
				euSignTest.PrivateKeyNameSessionStorageName, keyName, false) ||
				!utils.SetSessionStorageItem(
					euSignTest.PrivateKeySessionStorageName, key, false) ||
				!utils.SetSessionStorageItem(
					euSignTest.PrivateKeyPasswordSessionStorageName, password, true) ||
				!euSignTest.storeCAServer()) {
				return false;
			}

			if (Array.isArray(certificates)) {
				if (!utils.SetSessionStorageItems(
					euSignTest.PrivateKeyCertificatesSessionStorageName,
					certificates, false)) {
					return false;
				}
			} else {
				if (!utils.SetSessionStorageItem(
					euSignTest.PrivateKeyCertificatesChainSessionStorageName,
					certificates, false)) {
					return false;
				}
			}

			return true;
		},

		//@@@ ****************************************************************************************************

		removeStoredPrivateKey: function () {
			utils.RemoveSessionStorageItem(
				euSignTest.PrivateKeyNameSessionStorageName);
			utils.RemoveSessionStorageItem(
				euSignTest.PrivateKeySessionStorageName);
			utils.RemoveSessionStorageItem(
				euSignTest.PrivateKeyPasswordSessionStorageName);
			utils.RemoveSessionStorageItem(
				euSignTest.PrivateKeyCertificatesChainSessionStorageName);
			utils.RemoveSessionStorageItem(
				euSignTest.PrivateKeyCertificatesSessionStorageName);

			euSignTest.removeCAServer();
		},

		//@@@ ****************************************************************************************************

		selectPrivateKeyFile: function (event) {
			var enable = (event.target.files.length == 1);

			setPointerEvents(document.getElementById('PKeyReadButton'), enable);
			document.getElementById('PKeyPassword').disabled =
				enable ? '' : 'disabled';
			document.getElementById('PKeyFileName').value =
				enable ? event.target.files[0].name : '';
			document.getElementById('PKeyPassword').value = '';

			if (enable) {
				var file = event.target.files[0];
				setPointerEvents(document.getElementById('PKeySaveInfo'),
					file.name.endsWith(".jks"));
			}
		},

		//@@@ ****************************************************************************************************

		getPrivateKeyCertificatesByCMP: function (key, password, onSuccess, onError) {
			try {
				var cmpAddress = euSignTest.getCAServer().cmpAddress + ":80";
				var keyInfo = euSign.GetKeyInfoBinary(key, password);
				onSuccess(euSign.GetCertificatesByKeyInfo(keyInfo, [cmpAddress]));
			} catch (e) {
				onError(e);
			}
		},

		//@@@ ****************************************************************************************************

		getPrivateKeyCertificates: function (key, password, fromCache, onSuccess, onError) {
			var certificates;

			if (euSignTest.CAServer != null &&
				euSignTest.CAServer.certsInKey) {
				onSuccess([]);
				return;
			}

			if (fromCache) {
				if (euSignTest.useCMP) {
					certificates = utils.GetSessionStorageItem(
						euSignTest.PrivateKeyCertificatesChainSessionStorageName, true, false);
				} else if (euSignTest.loadPKCertsFromFile) {
					certificates = utils.GetSessionStorageItems(
						euSignTest.PrivateKeyCertificatesSessionStorageName, true, false)
				}

				onSuccess(certificates);
			} else if (euSignTest.useCMP) {
				euSignTest.getPrivateKeyCertificatesByCMP(
					key, password, onSuccess, onError);
			} else if (euSignTest.loadPKCertsFromFile) {
				var _onSuccess = function (files) {
					var certificates = [];
					for (var i = 0; i < files.length; i++) {
						certificates.push(files[i].data);
					}

					onSuccess(certificates);
				};

				euSign.ReadFiles(
					euSignTest.privateKeyCerts,
					_onSuccess, onError);
			}
		},

		//@@@ ****************************************************************************************************

		readPrivateKey: function (keyName, key, password, certificates, fromCache) {
			var _onError = function (e) {
				setStatus('');

				if (fromCache) {
					euSignTest.removeStoredPrivateKey();
					euSignTest.privateKeyReaded(false);
				} else {
					alert(e);
				}

				if (e.GetErrorCode != null &&
					e.GetErrorCode() == EU_ERROR_CERT_NOT_FOUND) {

					euSignTest.mainMenuItemClicked(
						document.getElementById('MainPageMenuCertsAndCRLs'),
						'MainPageMenuCertsAndCRLsPage');
				}
			};

			if (certificates == null) {
				var _onGetCertificates = function (certs) {
					if (certs == null) {
						_onError(euSign.MakeError(EU_ERROR_CERT_NOT_FOUND));
						return;
					}

					euSignTest.readPrivateKey(keyName, key, password, certs, fromCache);
				}

				euSignTest.getPrivateKeyCertificates(
					key, password, fromCache, _onGetCertificates, _onError);
				return;
			}

			try {
				if (Array.isArray(certificates)) {
					for (var i = 0; i < certificates.length; i++) {
						euSign.SaveCertificate(certificates[i]);
					}
				} else {
					euSign.SaveCertificates(certificates);
				}

				euSign.ReadPrivateKeyBinary(key, password);

				if (!fromCache && utils.IsSessionStorageSupported()) {
					if (!euSignTest.storePrivateKey(
						keyName, key, password, certificates)) {
						euSignTest.removeStoredPrivateKey();
					}
				}

				euSignTest.privateKeyReaded(true);

				euSignTest.updateCertList();

				if (!fromCache)
					euSignTest.showOwnerInfo();
			} catch (e) {
				_onError(e);
			}
		},

		//@@@ ****************************************************************************************************

		readPrivateKeyAsStoredFile: function () {
			var keyName = utils.GetSessionStorageItem(
				euSignTest.PrivateKeyNameSessionStorageName, false, false);
			var key = utils.GetSessionStorageItem(
				euSignTest.PrivateKeySessionStorageName, true, false);
			var password = utils.GetSessionStorageItem(
				euSignTest.PrivateKeyPasswordSessionStorageName, false, true);
			if (keyName == null || key == null || password == null)
				return;

			euSignTest.loadCAServer();

			setStatus('зчитування ключа');
			setPointerEvents(document.getElementById('PKeyReadButton'), true);
			document.getElementById('PKeyFileName').value = keyName;
			document.getElementById('PKeyPassword').value = password;
			var _readPK = function () {
				euSignTest.readPrivateKey(keyName, key, password, null, true);
			}
			setTimeout(_readPK, 10);

			return;
		},

		// ЗЧИТУВАННЯ ОСОБИСТОГО КЛЮЧА (НАТИСКАННЯ НА КНОПКУ ЗЧИТАТИ) //****************************************************************************************************

		readPrivateKeyButtonClick: function () {
			var passwordTextField = document.getElementById('PKeyPassword');
			var certificatesFiles = euSignTest.privateKeyCerts;

			var _onError = function (e) {
				setStatus('');
				alert(e);
			};

			var _onSuccess = function (keyName, key) {
				euSignTest.readPrivateKey(keyName, new Uint8Array(key),
					passwordTextField.value, null, false);
			}

			try {
				if (document.getElementById('PKeyReadButton').title == 'Зчитати') {
					setStatus('зчитування ключа');

					var files = document.getElementById('PKeyFileInput').files;

					if (files.length != 1) {
						_onError("Виникла помилка при зчитуванні особистого ключа. " +
							"Опис помилки: файл з особистим ключем не обрано");
						return;
					}

					if (passwordTextField.value == "") {
						passwordTextField.focus();
						_onError("Виникла помилка при зчитуванні особистого ключа. " +
							"Опис помилки: не вказано пароль доступу до особистого ключа");
						return;
					}

					if (euSignTest.loadPKCertsFromFile &&
						(certificatesFiles == null ||
							certificatesFiles.length <= 0)) {
						_onError("Виникла помилка при зчитуванні особистого ключа. " +
							"Опис помилки: не обрано жодного сертифіката відкритого ключа");
						return;
					}

					if (utils.IsFileImage(files[0])) {
						euSignTest.readPrivateKeyAsImage(files[0], _onSuccess, _onError);
					}
					else {
						var _onFileRead = function (readedFile) {
							_onSuccess(readedFile.file.name, readedFile.data);
						};

						euSign.ReadFile(files[0], _onFileRead, _onError);
					}
				} else {
					euSignTest.removeStoredPrivateKey();
					euSign.ResetPrivateKey();
					euSignTest.privateKeyReaded(false);
					passwordTextField.value = "";
					euSignTest.clearPrivateKeyCertificatesList();
				}
			} catch (e) {
				_onError(e);
			}
		},

		// ПРОДЕМОНСТРУВАТИ ІНФОРМАЦІЮ КОРИСТУВАЧА //****************************************************************************************************

		showOwnerInfo: function () {
			try {
				var ownerInfo = euSign.GetPrivateKeyOwnerInfo();

				alert("Власник: " + ownerInfo.GetSubjCN() + "\n" +
					"ЦСК: " + ownerInfo.GetIssuerCN() + "\n" +
					"Серійний номер: " + ownerInfo.GetSerial());
			} catch (e) {
				alert(e);
			}
		},

		// ПРОДЕМОНСТРУВАТИ ІНФОРМАЦІЮ ПРО СЕРТИФІКАТИ КОРИСТУВАЧА //****************************************************************************************************

		showOwnCertificates: function () {
			try {
				var splitLine = "--------------------------------------------------";
				var message = "Інформація про сертифікат(и) користувача:\n";
				var i = 0;
				while (true) {
					var info = euSign.EnumOwnCertificates(i);
					if (info == null)
						break;

					var isNationalAlgs =
						(info.GetPublicKeyType() == EU_CERT_KEY_TYPE_DSTU4145);

					message += splitLine + "\n";
					message += "Сертифікат № " + (i + 1) + "\n" +
						"Власник: " + info.GetSubjCN() + "\n" +
						"ЦСК: " + info.GetIssuerCN() + "\n" +
						"Серійний номер: " + info.GetSerial() + "\n" +
						"Призначення: " + info.GetKeyUsage() +
						(isNationalAlgs ? " в державних " : " в міжнародних ") +
						"алгоритмах та протоколах" + "\n";
					message += splitLine + "\n";

					i++;
				}

				if (i == 0)
					message += "Відсутня";

				alert(message);

			} catch (e) {
				alert(e);
			}
		},

		// ОТРИМАТИ ІНФОРМАЦІЮ ПРО КОНТЕЙНЕР JKS (ЗБЕРІГАННЯ ІНФОРМАЦІЙ ПРО КЛЮЧ) //****************************************************************************************************

		getJKSContainerInfo: function (jksContainer, password) {
			var info = '\tІнформація про JKS контейнер:\n';

			try {
				var keyIndex = 0;
				while (true) {
					var keyAlias = euSign.EnumJKSPrivateKeys(jksContainer, keyIndex);
					if (keyAlias == null)
						break;
					var jksKey = euSign.GetJKSPrivateKey(jksContainer, keyAlias);

					info += (keyIndex + 1) + '\n';
					info += 'Alias ключа: ' + keyAlias + '\n';
					info += 'Сертифікати: ' + '\n';

					for (var i = 0; i < jksKey.GetCertificatesCount(); i++) {
						var cert = jksKey.GetCertificate(i);
						var certInfo = euSign.ParseCertificate(cert);
						info += "Сертифікат № " + (i + 1) + '\n';
						info += "Власник: " + certInfo.GetSubject() + '\n';
						info += "ЦСК: " + certInfo.GetIssuer() + '\n';
						info += "Реєстраційний номер: " + certInfo.GetSerial() + '\n';
						info += "Призначення: " + certInfo.GetKeyUsage() + '\n';
						info += "Розширенне призначення: " + certInfo.GetExtKeyUsages() + '\n';
						info += "Бінарне подання: " + euSign.Base64Encode(cert) + '\n';
					}

					info += 'Інформація про відкриті ключі:\n';
					try {
						var keyInfo = euSign.GetKeyInfoBinary(
							jksKey.GetPrivateKey(), password);
						info += "Бінарне подання: " + euSign.Base64Encode(keyInfo) + '\n';
					} catch (e) {
						info += e + '\n';
					}

					keyIndex++;
				}
			} catch (e) {
				info += e + '\n';
			}

			return info;
		},

		savePKeyInfo: function () {
			var pThis = this;
			var pkFileInput = document.getElementById('PKeyFileInput');

			if (pkFileInput.files.length == 0) {
				alert('Файл з особистим ключем не обрано');
				return;
			}

			var _onError = function (msg) {
				alert("Виникла помилка при " +
					"збереженні інформації про ос. ключ. " + msg);
			};

			var pkFile = pkFileInput.files[0];
			var password = document.getElementById('PKeyPassword').value;
			var info = 'Інформація про ос. ключ:\n';
			info += 'Ім`я файлу:' + pkFile.name + '\n\n';

			var encoder = new StringEncoder("UTF-8", true);

			eu_wait(function (runNext) {
				euSign.ReadFile(
					pkFile,
					runNext,
					function (e) {
						_onError(e);
					}
				);
			}).eu_wait(function (runNext, pkFileData) {
				var keyData = pkFileData.data;
				if (pkFile.name.endsWith(".jks")) {
					info += pThis.getJKSContainerInfo(keyData, password) + '\n';
				} else {
					info += 'Інформація про відкритий ключ:\n';
					try {
						var keyInfo = euSign.GetKeyInfoBinary(keyData, password);
						info += "Бінарне подання: " + euSign.Base64Encode(keyInfo) + '\n';
					} catch (e) {
						info += e + '\n';
					}
				}

				info += 'Інформація про зчитаний ключ:\n';
				try {
					if (euSign.IsPrivateKeyReaded()) {
						var i = 0;
						while (true) {
							var certInfo = euSign.EnumOwnCertificates(i);
							if (certInfo == null)
								break;
							var cert = euSign.GetCertificate(
								certInfo.GetIssuer(), certInfo.GetSerial());

							info += "Сертифікат № " + (i + 1) + '\n';
							info += "Власник: " + certInfo.GetSubject() + '\n';
							info += "ЦСК: " + certInfo.GetIssuer() + '\n';
							info += "Реєстраційний номер: " + certInfo.GetSerial() + '\n';
							info += "Призначення: " + certInfo.GetKeyUsage() + '\n';
							info += "Розширенне призначення: " + certInfo.GetExtKeyUsages() + '\n';
							info += "Бінарне подання: " + euSign.Base64Encode(cert) + '\n';

							i++;
						}
					} else {
						info += 'Ключ не зчитано' + '\n';
					}
				} catch (e) {
					info += e + '\n';
				}

				saveFile(pkFile.name + '.txt',
					new Uint8Array(encoder.encode(info)));
			});
		},

		// НАЛАШТУВАННЯ ПІДПИСУ //****************************************************************************************************

		signData: function () {
			var isInternalSign =
				document.getElementById("InternalSignCheckbox").checked;
			var isAddCert =
				document.getElementById("AddCertToInternalSignCheckbox").checked;
			var isSignHash =
				document.getElementById("SignHashCheckbox").checked;
			// var dsAlgType = parseInt(document.getElementById("DSAlgTypeSelect").value) // Here is change +-
			var dsAlgType = parseInt("1"); // Here is change +-

			signedDataText.value = "";

			var _signDataFunction = function () {
				try {
					var sign = "";
					if (dsAlgType == 1) {
						if (isInternalSign) {
							sign = euSign.SignDataInternal(isAddCert, data, true);
						} else {
							if (isSignHash) {
								var hash = euSign.HashData(data);
								sign = euSign.SignHash(hash, true);
							} else {
								sign = euSign.SignData(data, true);
							}
						}
					} else {
						sign = euSign.SignDataRSA(data, isAddCert,
							!isInternalSign, true);
					}

					signedDataText.value = sign;
					setStatus('');
				} catch (e) {
					setStatus('');
					alert(e);
				}
			};

			setStatus('підпис данних');
			setTimeout(_signDataFunction, 10);
		},

		//?????????  // ОТРИМАТИ РЯДОК ТИПУ ЗНАКА //****************************************************************************************************

		getSignTypeString: function (signType) {
			switch (signType) {
				case EU_SIGN_TYPE_CADES_BES:
					return 'базовий';
				case EU_SIGN_TYPE_CADES_T:
					return 'з позначкою часу від ЕЦП';
				case EU_SIGN_TYPE_CADES_C:
					return 'з посиланням на повні дані для перевірки';
				case EU_SIGN_TYPE_CADES_X_LONG:
					return 'з повними даними для перевірки';
				case EU_SIGN_TYPE_CADES_X_LONG | EU_SIGN_TYPE_CADES_X_LONG_TRUSTED:
					return 'з повними даними ЦСК для перевірки';
				default:
					return 'невизначено';
			}
		},

		// ПЕРЕВІРКА ПІДПИСУ //****************************************************************************************************

		verifyData: function () {
			var pThis = this;
			var isInternalSign =
				document.getElementById("InternalSignCheckbox").checked;
			var isSignHash =
				document.getElementById("SignHashCheckbox").checked;
			var isGetSignerInfo =
				document.getElementById("GetSignInfoCheckbox").checked;
			// var dsAlgType = parseInt(document.getElementById("DSAlgTypeSelect").value) // Here is change +-
			var dsAlgType = parseInt("1"); // Here is change +-


			var _verifyDataFunction = function () {
				try {
					var info = "";

					var message = "Підпис успішно перевірено";

					if (isGetSignerInfo) {
						var ownerInfo = info.GetOwnerInfo();
						var timeInfo = info.GetTimeInfo();

						message += "\n";
						message += "Підписувач: " + ownerInfo.GetSubjCN() + "\n" +
							"ЦСК: " + ownerInfo.GetIssuerCN() + "\n" +
							"Серійний номер: " + ownerInfo.GetSerial() + "\n";
						if (timeInfo.IsTimeAvail()) {
							message += (timeInfo.IsTimeStamp() ?
								"Мітка часу (від даних):" : "Час підпису: ") + timeInfo.GetTime();
						} else {
							message += "Час підпису відсутній";
						}

						if (timeInfo.IsSignTimeStampAvail()) {
							message += "\nМітка часу (від підпису):" + timeInfo.GetSignTimeStamp();
						}

						message += '\nТип підпису: ' + signType;
					}

					if (isInternalSign) {
						message += "\n";
						verifiedDataText.value = euSign.ArrayToString(info.GetData());
						message += "Підписані дані: " + verifiedDataText.value + "\n";
					}

					setStatus('');
					alert(message);
				} catch (e) {
					setStatus('');
					alert(e);
				}
			}

			setStatus('перевірка підпису даних');
			setTimeout(_verifyDataFunction, 10);
		},

		//@@@ ****************************************************************************************************

		chooseFileToSign: function (event) {
			var enable = (event.target.files.length == 1);

			setPointerEvents(document.getElementById('SignFileButton'), enable);
		},

		//@@@ ****************************************************************************************************

		chooseFileToVerify: function (event) {
			var enable = (document.getElementById('FileToVerify').files.length == 1) &&
				(document.getElementById("InternalSignCheckbox").checked ||
					document.getElementById('FileWithSign').files.length == 1)

			setPointerEvents(document.getElementById('VerifyFileButton'), enable);
		},

		//@@@ ****************************************************************************************************

		signFile: function () {
			var file = document.getElementById('FileToSign').files[0];

			if (file.size > Module.MAX_DATA_SIZE) {
				alert("Розмір файлу для піпису занадто великий. Оберіть файл меншого розміру");
				return;
			}

			var fileReader = new FileReader();

			fileReader.onloadend = (function (fileName) {
				return function (evt) {
					if (evt.target.readyState != FileReader.DONE)
						return;

					var isInternalSign =
						document.getElementById("InternalSignCheckbox").checked;
					var isAddCert = document.getElementById(
						"AddCertToInternalSignCheckbox").checked;
					// var dsAlgType = parseInt(
					// 	document.getElementById("DSAlgTypeSelect").value);  // Here is change +-
					var dsAlgType = parseInt("1"); // Here is change +-

					var data = new Uint8Array(evt.target.result);

					try {
						var sign;

						if (dsAlgType == 1) {
							if (isInternalSign)
								sign = euSign.SignDataInternal(isAddCert, data, false);
							else
								sign = euSign.SignData(data, false);
						} else {
							sign = euSign.SignDataRSA(data, isAddCert,
								!isInternalSign, false);
						}

						saveFile(fileName + ".p7s", sign);

						setStatus('');
						alert("Файл успішно підписано");
					} catch (e) {
						setStatus('');
						alert(e);
					}
				};
			})(file.name);

			setStatus('підпис файлу');
			fileReader.readAsArrayBuffer(file);
		},

		//@@@ ****************************************************************************************************

		verifyFile: function () {
			var pThis = this;
			var isInternalSign =
				document.getElementById("InternalSignCheckbox").checked;
			var isGetSignerInfo =
				document.getElementById("GetSignInfoCheckbox").checked;
			var files = [];

			files.push(document.getElementById('FileToVerify').files[0]);
			if (!isInternalSign)
				files.push(document.getElementById('FileWithSign').files[0]);

			if ((files[0].size > (Module.MAX_DATA_SIZE + EU_MAX_P7S_CONTAINER_SIZE)) ||
				(!isInternalSign && (files[1].size > Module.MAX_DATA_SIZE))) {
				alert("Розмір файлу для перевірки підпису занадто великий. Оберіть файл меншого розміру");
				return;
			}

			var _onSuccess = function (files) {
				try {
					var info = "";
					if (isInternalSign) {
						info = euSign.VerifyDataInternal(files[0].data);
					} else {
						info = euSign.VerifyData(files[0].data, files[1].data);
					}
					var signType = pThis.getSignTypeString(
						euSign.GetSignType(0, files[isInternalSign ? 0 : 1].data));

					var message = "Підпис успішно перевірено";

					if (isGetSignerInfo) {
						var ownerInfo = info.GetOwnerInfo();
						var timeInfo = info.GetTimeInfo();

						message += "\n";
						message += "Підписувач: " + ownerInfo.GetSubjCN() + "\n" +
							"ЦСК: " + ownerInfo.GetIssuerCN() + "\n" +
							"Серійний номер: " + ownerInfo.GetSerial() + "\n";
						if (timeInfo.IsTimeAvail()) {
							message += (timeInfo.IsTimeStamp() ?
								"Мітка часу (від даних):" : "Час підпису: ") + timeInfo.GetTime();
						} else {
							message += "Час підпису відсутній";
						}

						if (timeInfo.IsSignTimeStampAvail()) {
							message += "\nМітка часу (від підпису):" + timeInfo.GetSignTimeStamp();
						}

						message += '\nТип підпису: ' + signType;
					}

					if (isInternalSign) {
						saveFile(files[0].name.substring(0,
							files[0].name.length - 4), info.GetData());
					}

					alert(message);
					setStatus('');
				} catch (e) {
					alert(e);
					setStatus('');
				}
			}

			var _onFail = function (files) {
				setStatus('');
				alert("Виникла помилка при зчитуванні файлів для перевірки підпису");
			}

			setStatus('перевірка підпису файлів');
			utils.LoadFilesToArray(files, _onSuccess, _onFail);
		},

		//@@@ ****************************************************************************************************

		isCertificateExtension: function (fileName) {
			if ((fileName.indexOf(".cer") >= 0) ||
				(fileName.indexOf(".p7b") >= 0))
				return true;
			return false;
		},
		isCRLExtension: function (fileName) {
			if ((fileName.indexOf(".crl") >= 0))
				return true;
			return false;
		},

		//@@@ ****************************************************************************************************

		useInternalSignCheckBoxClick: function () {
			var intSignCheckbox =
				document.getElementById("InternalSignCheckbox");
			var addCertToIntSignCheckbox =
				document.getElementById("AddCertToInternalSignCheckbox");
			var signHashCheckbox =
				document.getElementById("SignHashCheckbox");
			var verifiedDataText =
				document.getElementById("VerifiedDataText");
			var fileWithSignSelectFile =
				document.getElementById("FileWithSign");

			if (intSignCheckbox.checked) {
				addCertToIntSignCheckbox.disabled = '';
				verifiedDataText.disabled = '';
				signHashCheckbox.disabled = 'disabled';
				fileWithSignSelectFile.disabled = 'disabled';
			} else {
				addCertToIntSignCheckbox.disabled = 'disabled';
				verifiedDataText.disabled = 'disabled';
				signHashCheckbox.disabled = '';
				fileWithSignSelectFile.disabled = '';
			}
		},

		//@@@ ****************************************************************************************************

		signHashCheckBoxClick: function () {
			var intSignCheckbox =
				document.getElementById("InternalSignCheckbox");
			var signHashCheckbox =
				document.getElementById("SignHashCheckbox");
			if (signHashCheckbox.checked) {
				intSignCheckbox.disabled = 'disabled';
			} else {
				intSignCheckbox.disabled = '';
			}
		},

		//@@@ ****************************************************************************************************

		DSCAdESTypeChanged: function () {
			var signType = CAdESTypes[
				document.getElementById('DSCAdESTypeSelect').selectedIndex];
			try {
				euSign.SetRuntimeParameter(EU_SIGN_TYPE_PARAMETER, signType);
			} catch (e) {
				alert(e);
			}

			document.getElementById('SignAddCAsCertificatesCheckbox').disabled =
				((signType & EU_SIGN_TYPE_CADES_X_LONG) ==
					EU_SIGN_TYPE_CADES_X_LONG) ? '' : 'disabled';
		},

		//@@@ ****************************************************************************************************

		signAddContentTimestampCheckBoxClick: function () {
			try {
				euSign.SetRuntimeParameter(EU_SIGN_INCLUDE_CONTENT_TIME_STAMP_PARAMETER,
					document.getElementById('SignAddContentTimestampCheckbox').checked);
			} catch (e) {
				alert(e);
			}
		},

		//@@@ ****************************************************************************************************

		signAddCAsCertificatesCheckBoxClick: function () {
			try {
				euSign.SetRuntimeParameter(EU_SIGN_INCLUDE_CA_CERTIFICATES_PARAMETER,
					document.getElementById('SignAddCAsCertificatesCheckbox').checked);
			} catch (e) {
				alert(e);
			}
		},

		//@@@ ****************************************************************************************************

		privateKeyReaded: function (isReaded) {
			var enabled = '';
			var disabled = 'disabled';

			if (!isReaded) {
				enabled = 'disabled';
				disabled = '';
			}

			setStatus('');

			document.getElementById('CAsServersSelect').disabled = disabled;
			setPointerEvents(document.getElementById('PKeySelectFileButton'), !isReaded);
			document.getElementById('PKeyFileName').disabled = disabled;

			document.getElementById('PKeyReadButton').title =
				isReaded ? 'Стерти' : 'Зчитати';
			document.getElementById('PKeyReadButton').innerHTML =
				isReaded ? 'Стерти' : 'Зчитати';

			document.getElementById('KeyReadedImage').style.display = isReaded ?
				"inline" : 'none';

			setPointerEvents(document.getElementById('PKeyShowOwnerInfoButton'), isReaded);
			setPointerEvents(document.getElementById('PKeyShowCertsInfoButton'), isReaded);
			setPointerEvents(document.getElementById('PKeySaveInfo'), isReaded);

			document.getElementById('PKeyPassword').disabled = disabled;
			if (!isReaded) {
				document.getElementById('PKeyPassword').value = '';
				document.getElementById('PKeyPassword').disabled = 'disabled';
				document.getElementById('PKeyFileName').value = '';
				document.getElementById('PKeyFileInput').value = null;
				setPointerEvents(document.getElementById('PKeyReadButton'), false);
			}
			document.getElementById('FileToSign').disabled = enabled;
			setPointerEvents(document.getElementById('SignFileButton'), isReaded);
		},

		//@@@ ****************************************************************************************************

		setSelectPKCertificatesEvents: function () {
			document.getElementById('ChoosePKCertsInput').addEventListener(
				'change', function (evt) {
					if (evt.target.files.length <= 0) {
						euSignTest.clearPrivateKeyCertificatesList();
					} else {
						euSignTest.privateKeyCerts = evt.target.files;
						euSignTest.setFileItemsToList("SelectedPKCertsList",
							evt.target.files);
					}
				}, false);
		},

		//@@@ ****************************************************************************************************

		clearPrivateKeyCertificatesList: function () {
			euSignTest.privateKeyCerts = null;
			document.getElementById('ChoosePKCertsInput').value = null;
			document.getElementById('SelectedPKCertsList').innerHTML =
				"Сертифікати відкритого ключа не обрано" + '<br>';
		},

		//@@@ ****************************************************************************************************

		setItemsToList: function (listId, items) {
			var output = [];
			for (var i = 0, item; item = items[i]; i++) {
				output.push('<li><strong>', item, '</strong></li>');
			}

			document.getElementById(listId).innerHTML =
				'<ul>' + output.join('') + '</ul>';
		},

		//@@@ ****************************************************************************************************

		setFileItemsToList: function (listId, items) {
			var output = [];
			for (var i = 0, item; item = items[i]; i++) {
				output.push('<li><strong>', item.name, '</strong></li>');
			}

			document.getElementById(listId).innerHTML =
				'<ul>' + output.join('') + '</ul>';
		}
	});

//=============================================================================

var euSignTest = EUSignCPTest();
var euSign = EUSignCP();
var utils = Utils(euSign);

//=============================================================================

function setPointerEvents(element, enable) {
	element.style.pointerEvents = enable ? "auto" : "none";
}

function setStatus(message) {
	if (message != '')
		message = '(' + message + '...)';
	document.getElementById('status').innerHTML = message;
}

function saveFile(fileName, array) {
	var blob = new Blob([array], { type: "application/octet-stream" });
	saveAs(blob, fileName);
}

function pageLoaded() {
	// document.getElementById('CertsAndCRLsFiles').addEventListener(
	// 	'change', euSignTest.chooseCertsAndCRLs, false);
	document.getElementById('PKeyFileInput').addEventListener(
		'change', euSignTest.selectPrivateKeyFile, false);
	document.getElementById('FileToSign').addEventListener(
		'change', euSignTest.chooseFileToSign, false);
	document.getElementById('FileToVerify').addEventListener(
		'change', euSignTest.chooseFileToVerify, false);
	document.getElementById('FileWithSign').addEventListener(
		'change', euSignTest.chooseFileToVerify, false);

	var appendMaxFileSizeLimit = function (textLabelId) {
		var str = document.getElementById(textLabelId).innerHTML;
		str = str.substring(0, str.length - 1) +
			" (не більше " + EU_MAX_DATA_SIZE_MB + " МБ):";
		document.getElementById(textLabelId).innerHTML = str;
	}

	appendMaxFileSizeLimit('ChooseFileForSignTextLabel');
	appendMaxFileSizeLimit('ChooseFileForVerifyTextLabel');
}

function EUSignCPModuleInitialized(isInitialized) {
	if (isInitialized)
		euSignTest.initialize();
	else
		alert("Криптографічну бібліотеку не ініціалізовано");
}

//=============================================================================