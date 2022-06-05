<?php
$token = "";
$token = date('His') . rand(100, 10000);
$cur_Date = date('Y-m-d');
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
	<title>ЕЦП</title>
	<link rel="shortcut icon" href="/Images/key2.ico" type="image/x-icon">
	<meta content="text/html; charset=utf-8" http-equiv="Content-Type">
	<meta name="KEYWORDS" content="<?php echo $sWebMetaK; ?>">
	<meta name="DESCRIPTION" content="<?php echo $sWebMetaD; ?>">
	<meta http-equiv="pragma" content="no-cache">
	<meta name="robots" content="index, follow">
	<meta name="viewport" content="width=device-width">
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous"></script>
	<script type="text/javascript" src="JS/common.js"></script>
	<script type="text/JavaScript" src="JS/euutils.js"></script>
	<script type="text/JavaScript" src="JS/euscpt.js"></script>
	<script type="text/JavaScript" src="JS/euscpm.js"></script>
	<script async type="text/javascript" src="JS/euscp.js"></script>
	<script type="text/JavaScript" src="JS/euscptest.js"></script>
	<script type="text/javascript" src="JS/fs/FileSaver.js"></script>
	<script type="text/JavaScript">
		function onBodyLoad() {
			pageLoaded();
		}
	</script>
</head>

<body onload="onBodyLoad();">

	<div class="container">
		<div class="row" style="justify-content: center;">
			<div class="col-7">
				<br>
				<div class="container">
					<nav class="navbar navbar-light bg-light">
						<div class="container">
							<h1><span class="badge bg-primary text-white">ЕЦП</span> <span>Підписання документів</span></h1>
							</a>
						</div>
					</nav>
					<div class="p-1 mb-0 bg-dark text-white" style="/* padding: 0.1rem; */padding: 0.1rem!important;--bs-bg-opacity: 0.2;"></div>
				</div>

				<br>

				<h4><span class="badge bg-dark">☰</span> Встановлення особистого ключа</h4>
				<hr />

				<div class="headerwhite1" colspan="2" valign="top">
					<span id="status" style="font-weight: normal;">(завантаження...)</span>
					<progress value="0" max="100" id="progress" hidden=1></progress>

					<img src="Images/lock-locked.svg" id="KeyReadedImage" style="width:24px; height:24px;display:none" align="right"></img>
				</div>
				<br>

				<h6>Оберіть ЦСК</h6>
				<div class="styled-select1">
					<select class="form-select" aria-label="Default select example" id="CAsServersSelect" style="width: 100%"></select>
				</div>
				<hr />

				<div>
					<h6>Оберіть файл з особистим ключем та вкажіть пароль захисту</h6>
				</div>

				<div class="row">
					<div class="col-6">
						<div class="custom-file">
							<label class="custom-file-label" for="customFile">Особистий ключ:</label>
							<div id="PKeyFileName" id="PKeyFileInput" class="PKeyFileNameEdit" readonly="true" onclick="document.getElementById('PKeyFileInput').click();" type="file" multiple="false"></div>
							<div id="buttonitem">
								<div id="PKeySelectFileButton" href="javascript:void(0);">
									<input class="form-control" id="PKeyFileInput" type="file" multiple="false"></input>
								</div>
							</div>
						</div>
					</div>
					<div class="col-4">
						<div class="form-group">
							<label for="exampleInputPassword1">Пароль захисту ключа:</label>
							<input id="PKeyPassword" type="password" class="form-control" id="exampleInputPassword1" placeholder="Password" disabled="disabled">
						</div>
					</div>
					<div class="col-2">
						<div style="padding-top: 24px;">
							<button type="button" class="btn btn-dark" id="PKeyReadButton" href="javascript:void(0);" title="Зчитати" onclick="euSignTest.readPrivateKeyButtonClick()">Зчитати</button>
						</div>
					</div>
				</div>
				<hr />

				<div class="row">

					<div class="btn-group" role="group" aria-label="Basic outlined example">
						<button type="button" class="btn btn-outline-primary" id="PKeyShowOwnerInfoButton" href="javascript:void(0);" onclick="euSignTest.showOwnerInfo()">Переглянути про власника</button>
						<button type="button" class="btn btn-outline-primary" id="PKeyShowCertsInfoButton" href="javascript:void(0);" onclick="euSignTest.showOwnCertificates()">Переглянути сертифікати</button>
						<button type="button" class="btn btn-outline-primary" id="PKeySaveInfo" href="javascript:void(0);" onclick="euSignTest.savePKeyInfo()">Зберегти інф. про ключ</button>
					</div>
				</div>
				<br>

				<div id="MainPageMenuSignPage" class="MainPageMenuPanel">
					<h4><span class="badge bg-dark">☰</span> Підпис та перевірка підпису даних</h4>
					<hr>

					<div class="TextImageContainer">
						<h5><span class="TextInTextImageContainer">Параметри підпису</span></h5>
					</div>

					<div class="" class="form-check" style="padding: 15px;">
						<input class="form-check-input" type="checkbox" id="InternalSignCheckbox" class="Checkbox" onclick="euSignTest.useInternalSignCheckBoxClick()" /> Використовувати внутрішній підпис<br>
						<input class="form-check-input" type="checkbox" id="GetSignInfoCheckbox" class="Checkbox" checked="true" /> Отримувати інформацію про підпис<br><br>

						<div class="TextLabel">Формат підпису:</div><br>
						<div class="styled-select1">
							<select class="form-select" id="DSCAdESTypeSelect" onchange="euSignTest.DSCAdESTypeChanged()">
								<option value="0" selected>базовий</option>
								<option value="1">з позначкою часу від ЕЦП</option>
								<option value="2">з посиланням на повні дані для перевірки</option>
								<option value="3">з повними даними для перевірки</option>
								<option value="4">з повними даними ЦСК для перевірки</option>
							</select>
						</div>
						<br>

						<input class="form-check-input" type="checkbox" id="SignAddContentTimestampCheckbox" class="Checkbox" checked="true" onclick="euSignTest.signAddContentTimestampCheckBoxClick()" /> Додавати позначку часу від даних<br>
						<input class="form-check-input" type="checkbox" id="SignAddCAsCertificatesCheckbox" class="Checkbox" checked="true" onclick="euSignTest.signAddCAsCertificatesCheckBoxClick()" disabled="disabled" /> Додавати повні дані для перевірки<br>
					</div>
					<hr>

					<div class="TextImageContainer">
						<h5><span class="TextInTextImageContainer">Підпис документу</span></h5>
					</div>

					<div class="TextLabel" id="ChooseFileForSignTextLabel">Оберіть файл для підпису:</div><br>
					<input class="form-control" id="FileToSign" type="file" class="SelectFile" name="files[]" disabled="disabled" style="margin-bottom:1em;" /><br>

					<div id="buttonitem" class="d-grid gap-2">
						<button class="btn btn-primary" type="button" id="SignFileButton" href="javascript:void(0);" title="Підписати" onclick="euSignTest.signFile()">Підписати документ</button>
					</div>
					<hr>

					<div class="TextImageContainer">
						<h5><span class="TextInTextImageContainer">Перевірка підпису</span></h5>
					</div>

					<div class="TextLabel" id="ChooseFileForVerifyTextLabel">Оберіть файл для перевірки:</div><br>
					<input class="form-control" id="FileToVerify" type="file" class="SelectFile" name="files[]" style="margin-bottom:1em;" /><br>
					<div class="TextLabel" id="ChooseFileWithSignTextLabel">Оберіть файл з підписом:</div><br>
					<input id="FileWithSign" class="form-control" type="file" class="SelectFile" name="files[]" style="margin-bottom:1em;" /><br>

					<div id="buttonitem" class="d-grid gap-2">
						<button class="btn btn-primary" type="button" class="btn btn-dark" id="VerifyFileButton" href="javascript:void(0);" title="Перевірити" onclick="euSignTest.verifyFile()">Перевірити документ на наявнісь підпису</button>
					</div>

					<br><br>

					<div class="text-center p-4" style="background-color: rgba(0, 0, 0, 0.05);">
						© 2022 Qualification project:
						<a class="text-reset fw-bold" href="https://github.com/bode4ok/Qualification-project">Bogdan Neruchok (GitHub)</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</body>

</html>