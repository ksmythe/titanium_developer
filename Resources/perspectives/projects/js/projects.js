Projects = {};

// project cache
Projects.projectList = [];

// current project
Projects.selectedProjectIdx = -1;

// current tab
Projects.selectedTab = -1;

// do we need to select a tab programtically
Projects.selectInitialTab = false;

// state var for project db
Projects.dbInitialized = false;

// default runtime version
Projects.currentRuntimeVersion = "0.4.0";

// used to increment new project IDs
Projects.highestId = 0;

// state var used to determine modules are loaded
Projects.modulesLoaded = false;

// track whether mobile SDKs are present
Projects.hasIPhone = false;
Projects.hasAndroid = false;
Projects.hasRunMobileCheck = false;

// URLs
Projects.ssoLoginURL = "sso-login";
Projects.ssoRegisterURL = "sso-register";
Projects.ssoResetPasswordURL = "sso-reset-password";

// TOKENS
Projects.userSID = null;
Projects.userToken = null;
Projects.userUID = null;
Projects.userUIDT = null;

// var to determine if login should be shown
Projects.needLogin = false;

//
//  Return current project object
//
Projects.getProject = function()
{
	if (Projects.selectedProjectIdx == -1  && Projects.projectList.length > 0)
	{
		 Projects.selectedProjectIdx = Projects.projectList[0].id;
	}
	for (var i=0;i<Projects.projectList.length;i++)
	{
		if (Projects.projectList[i].id == Projects.selectedProjectIdx)
		{
			return Projects.projectList[i];
		}
	}
	return Projects.projectList[Projects.projectList.length -1];
};

//
// Once modules are loaded, we may select the initial tab 
//
$MQL('l:tidev.modules.loaded',function()
{
	Projects.modulesLoaded = true;
	if (Projects.selectInitialTab == true)
	{
		TiDev.subtabChange(0);
	}
});

//
// create user record
//
Projects.createUser = function()
{
	// get data from form
	var email = $('#login_email').val();
	var password = $('#login_password').val();
	var lname = $('#login_lname').val();
	var fname = $('#login_fname').val();
	var org = $('#login_org').val();
	var city = $('#login_city').val();
	var state = $('#login_state').val();
	var country = $('#login_country').val();
	var twitter = $('#login_twitter').val();
	
	// register failure callback
	function registerFailed(resp)
	{
		$('#progress_message').css('display','none');
		$('#error_message').html('request timed out.  make sure you are online.');
		$('#error_message_area').css('display','inline');	
	}
	
	// register success callback
	function registerOK(resp)
	{
		// insert user record
		if (resp.success == true)
		{
			// record token vars
			Projects.userSID = resp.sid;
			Projects.userToken = resp.token;
			Projects.userUID = resp.uid;
			Projects.userUIDT = resp.uidt;

			// create user record
			try
			{
				TiDev.db.execute('INSERT INTO USERS (fname, lname, email, password, organization, city, state, country, twitter) VALUES (?,?,?,?,?,?,?,?,?)',
					fname,lname,email,password,org,city,state,country,twitter)
			}
			// create table and try again
			catch (e)
			{
				TiDev.db.execute('CREATE TABLE USERS (fname TEXT, lname TEXT, email TEXT, password TEXT, organization TEXT, city TEXT, state TEXT, country TEXT, twitter TEXT, twitter_password TEXT)');
				TiDev.db.execute('INSERT INTO USERS (fname, lname, email, password, organization, city, state, country, twitter) VALUES (?,?,?,?,?,?,?,?,?)',
					fname,lname,email,password,org,city,state,country,twitter);		
			}

			Projects.needLogin = false;
			Projects.setupPostLoginView();					

			// show authenticated indicator
			$('#tiui_shield_off').css('display','none');
			$('#tiui_shield_on').css('display','inline');
		}
		// show error
		else
		{
			$('#progress_message').css('display','none');
			$('#error_message').html('sign up error: ' + resp.reason);
			$('#error_message_area').css('display','inline');	
		}
		
	};
	// create remote reigstration
	TiDev.invokeCloudService(
		Projects.ssoRegisterURL,
		{
			un:email,
			pw:password,
			firstname:fname,
			lastname:lname,
			organization:org,
			city:city,
			state:state,
			country:country,
			twitter:twitter	
		},
		'POST',
		registerOK,
		registerFailed
	);
	
};

//
// setup post login/signup page
//
Projects.setupPostLoginView = function()
{
	// reset UI components
	$('body').css('opacity','0')
	$('#tiui_header').css('display','block');
	$('#tiui_content_body').css('top','74px');
	Titanium.UI.currentWindow.setHeight(620);
	Titanium.UI.currentWindow.setResizable(true);
	$('body').animate({'opacity':'1.0'},1400);

	// setup UI view
	Projects.setupView();
	
};

//
// setup Login/Signup
//
Projects.showLogin = function()
{
	Projects.needLogin = true;
	
	TiUI.setBackgroundColor('#575757');
	
	// format window
	$('#tiui_header').css('display','none');
	TiDev.contentLeftShowButton.hide();
	TiDev.contentLeftHideButton.hide();
	TiDev.contentLeft.hide();
	TiDev.subtabs.hide();
	$('#tiui_content_body').css('top','0px');
	
	// load signup/login page
	var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('perspectives/projects/login_signup.html'));
	$('#tiui_content_right').get(0).innerHTML = file.read();
	
	// setup buttons
	TiUI.GreyButton({id:'login_button'});
	TiUI.GreyButton({id:'signup_button'});
	TiUI.GreyButton({id:'reset_password_button'});
	
	// setup checkbox for reset on/off
	$('#reset_pw_checkbox').click(function()
	{
		if($(this).val()=='on')
		{
			$('#password_field').css('display','none');
			$('#login_button').css('display','none');
			$('#reset_password_button').css('display','inline');
		}
		else
		{
			$('#reset_password_button').css('display','none');
			$('#login_button').css('display','inline');
			$('#password_field').css('display','block');			
		}
	});
	
	// reset password handler
	$('#reset_password_button').click(function()
	{
		// show progress message
		$('#error_message_area').css('display','none');
		$('#progress_message').css('display','inline');

		var email = $('#login_email').val();

		// reset password success callback
		function resetOK(resp)
		{
			$('#progress_message').css('display','none');
			if (resp.success == true)
			{
				$('#success_message').css('display','inline');
				setTimeout(function()
				{
					$('#success_message').css('display','none');
				},3000)
			}
			else
			{
				$('#error_message').html('reset error: ' + resp.reason);
				$('#error_message_area').css('display','inline');
			}			
		};
		
		// reset password failed callback
		function resetFailed(resp)
		{
			$('#progress_message').css('display','none');
			$('#error_message').html('request timed out.  make sure you are online.');
			$('#error_message_area').css('display','inline');			
		};
		
		// reset password
		TiDev.invokeCloudService(Projects.ssoResetPasswordURL,{un:email},'POST',resetOK, resetFailed);
	});
	
	// login button handler
	$('#login_button').click(function()
	{
		if ($('#login_button').hasClass('disabled'))return;

		// show progress message
		$('#error_message_area').css('display','none');
		$('#progress_message').css('display','inline');

		var email = $('#login_email').val();
		var password = $('#login_password').val();

		// login success callback
		function loginOK(resp)
		{
			if (resp.success == true)
			{
				Projects.userSID = resp.sid;
				Projects.userToken = resp.token;
				Projects.userUID = resp.uid;
				Projects.userUIDT = resp.uidt;
				
				TiDev.permissions  = resp.permissions;
				
				// we have NO local data - so create record
				if (Projects.needLogin == true)
				{
					try
					{
						TiDev.db.execute('INSERT INTO USERS (email, password) VALUES (?,?)',email,password);
					}
					// create table and try again
					catch (e)
					{
						TiDev.db.execute('CREATE TABLE USERS (fname TEXT, lname TEXT, email TEXT, password TEXT, organization TEXT, city TEXT, state TEXT, country TEXT, twitter TEXT, twitter_password TEXT)');
						TiDev.db.execute('INSERT INTO USERS (email, password) VALUES (?,?)',email,password);
					}					
					Projects.needLogin = false;
				}
				
				// run through ui setup again
				Projects.setupPostLoginView();	

				// show authenticated indicator
				$('#tiui_shield_off').css('display','none');
				$('#tiui_shield_on').css('display','inline');
			}
			else
			{
				$('#progress_message').css('display','none');
				$('#error_message').html('login error: ' + resp.reason)
				$('#error_message_area').css('display','inline');			
			}
		};
		
		// login failed callback
		function loginFailed(resp)
		{
			$('#progress_message').css('display','none');
			$('#error_message').html('request timed out.  make sure you are online.');
			$('#error_message_area').css('display','inline');	
		};
		
		// login
		TiDev.invokeCloudService(Projects.ssoLoginURL,{un:email,pw:password},'POST',loginOK, loginFailed);
	});

	// signup button handler
	$('#signup_button').click(function()
	{
		if ($('#signup_button').hasClass('disabled'))return;
		
		$('#error_message_area').css('display','none');
		$('#progress_message').css('display','inline');
		var password = $('#login_password').val();
		var passwordRepeat = $('#login_repeat_password').val();
		
		if (password != passwordRepeat)
		{
			$('#progress_message').css('display','none');
			$('#error_message').html('password and re-type password must match.')
			$('#error_message_area').css('display','inline');
			return;
		}
		if (password.length < 4)
		{
			$('#progress_message').css('display','none');
			$('#error_message').html('password must be at least 4 characters.')
			$('#error_message_area').css('display','inline');
			return;
		}
		
		// insert a new record
		Projects.createUser(); 
	});
	
	// handler to show registration
	$('#register_tab').click(function()
	{
		$('#login_frame').animate({'height':'400px'});
		$('#login_button').hide();
		$('#reset_checkbox_container').hide();
		$('#reset_password_button').hide();
		$('#registration_fields').fadeIn();
		$('#login_tab').removeClass('active');
		$('#register_tab').addClass('active');
		$('#password_field').css('display','block');
	});
	// handler to show login
	$('#login_tab').click(function()
	{
		$('#registration_fields').hide();
		$('#login_frame').animate({'height':'100px'});
		$('#login_button').show();
		$('#reset_checkbox_container').show();
		$('#login_tab').addClass('active');
		$('#register_tab').removeClass('active');
		$('#reset_pw_checkbox').removeAttr('checked');
	});
	
	// validation for login
	TiUI.validator('login',function(valid)
	{
		if (valid) 
			$('#login_button').removeClass('disabled');
		else
			$('#login_button').addClass('disabled');
	});
	
	// validation for signup
	TiUI.validator('signup',function(valid)
	{
		if (valid) 
			$('#signup_button').removeClass('disabled');
		else
			$('#signup_button').addClass('disabled');
	});

	// validation for reset password
	TiUI.validator('reset',function(valid)
	{
		if (valid) 
			$('#reset_password_button').removeClass('disabled');
		else
			$('#reset_password_button').addClass('disabled');
	});
	
	Titanium.UI.currentWindow.setResizable(false);
	Titanium.UI.currentWindow.setHeight(580);
	
};

//
//  Initialize UI
//
Projects.setupView = function()
{
	TiUI.setBackgroundColor('#1c1c1c');
	// see if user has registered
 	try
	{
		var email = null;
		var password = null;	
		var dbrow = TiDev.db.execute('SELECT email, password from USERS');
		while(dbrow.isValidRow())
		{
			email = dbrow.fieldByName('email');
			password = dbrow.fieldByName('password');
			break;
		}
		// if no data, show Login
		if (email == null)
		{
			Projects.showLogin();
			return;
		}
		// 
		// we have a user record, do auto-login to get tokens
		//
		if (Projects.userSID == null && Titanium.Network.online==true)
		{
			// login success callback
			function loginOK (resp)
			{
				// good
				if (resp.success==true)
				{
					Projects.userSID = resp.sid;
					Projects.userToken = resp.token;
					Projects.userUID = resp.uid;
					Projects.userUIDT = resp.uidt;

					TiDev.permissions  = resp.permissions;
					// show authenticated indicator
					$('#tiui_shield_off').css('display','none');
					$('#tiui_shield_on').css('display','inline');

					Projects.showAuthenticatedView();
				}
				// WTF?
				else
				{
					// we are in a weird state, drop user table
					TiDev.db.execute('DELETE FROM USERS');
					Projects.showLogin();
				}
			};
			
			// login failed callback
			function loginFailed(resp)
			{
				$('#tiui_shield_on').css('display','none');
				$('#tiui_shield_off').css('display','inline');
				if (resp.offline == true)
				{
					Projects.showAuthenticatedView();
				}
			};
			// login
			TiDev.invokeCloudService(Projects.ssoLoginURL,{un:email,pw:password},'POST',loginOK, loginFailed);
		}
		else
		{
			Projects.showAuthenticatedView();
		}
	}
	catch (e)
	{
		Projects.showLogin();
	}
};

//
//  Show authenticated view
//
Projects.showAuthenticatedView = function()
{
	// set default UI state
	TiDev.contentLeftShowButton.hide();
	TiDev.contentLeftHideButton.show();
	TiDev.contentLeft.show();
	TiDev.subtabs.hide();
	
	// initialize project db stuff
	if (Projects.dbInitialized==false)
	{
		Projects.initDB();
	}
	// show no project view
	if (Projects.projectList.length == 0)
	{
		TiDev.contentLeft.setContent('<div class="parent">PROJECTS</div><div class="child"><div>No Projects</div></div>');

		var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('perspectives/projects/projects.html'));
		$('#tiui_content_right').get(0).innerHTML = file.read();
		$('#projects').css('display','block')	
		
		$('#import_project_button').click(function()
		{
			Projects.handleImportClick();
		});
		//
		// New project click listener
		//
		$('#new_project_button_2').click(function()
		{
			Projects.handleNewProjectClick();
		});
		
	}
	
	// show project view
	else
	{
		// set base UI stuff
		$('#no_project_view').css('display','none');
		TiDev.subtabs.show();		

		// if we have projects and no tab is selected, select edit
		if (TiDev.subtabs.activeIndex = -1)
		{
			Projects.selectInitialTab = true;

			// if all modules are loaded, select first tab
			if (Projects.modulesLoaded == true)
			{
				TiDev.subtabChange(0);
			}
		}
		
		// paint tree
		var html = '<div class="parent">PROJECTS</div>';
		for (var i=0;i<Projects.projectList.length;i++)
		{
			var classes = 'child ';
			
			if (Projects.selectedProjectIdx == -1 && i == 0)
			{
				classes += 'active';
				Projects.selectedProjectIdx = Projects.projectList[i].id;
			}
			else if (Projects.selectedProjectIdx == Projects.projectList[i].id)
			{
				classes += 'active';
			}

			// if we are active and mobile - don't show links
			if (classes.indexOf('active') != -1)
			{
				if (Projects.projectList[i].type == 'mobile')
				{
					TiDev.subtabs.hideTab(2)
				}
				else
				{
					TiDev.subtabs.showTab(2)
				}
			}
			html += '<div class="'+classes+'" project_id="'+Projects.projectList[i].id+'">';
			html += '<div>' + Projects.projectList[i].name + '</div></div>';
		}
		
		// fire selected message
		$MQ('l:tidev.projects.row_selected',{'project_id':Projects.selectedProjectIdx});			
		
		
		// set content
		TiDev.contentLeft.setContent(html);
		
		// create click handler
		$('.#tiui_content_left .child').click(function()
		{
			TiDev.subtabs.show();		
			$('#tiui_content_left .child').removeClass('active');
			$(this).addClass('active');
			Projects.selectedProjectIdx = $(this).attr('project_id');	
			if (Projects.getProject().type == 'mobile')
			{
				TiDev.subtabs.hideTab(2);
			}		
			else
			{
				TiDev.subtabs.showTab(2);
			}
			$MQ('l:tidev.projects.row_selected',{'project_id':Projects.selectedProjectIdx,'activeTab':TiDev.activeSubtab.name});
		});
		
	}
	
};

//
// When all modules are loaded check to see selected project type
// mobile projects don't have a links tab
// we need this check in two places because of timing issues
//
$MQL('l:tidev.modules.loaded',function()
{
	var p = Projects.getProject();
	if (p)
	{
		if (p.type == 'mobile')
		{
			TiDev.subtabs.hideTab(2)
		}
		else
		{
			TiDev.subtabs.showTab(2)
		}
	}
});
//
// Handle UI events
//
Projects.eventHandler = function(event)
{
	if (event == 'load')
	{
		Projects.setupView();
	}
	else if (event == 'focus')
	{
		Projects.setupView();
	}
	else
	{
		
	}
}

//
//  Init DB and load projects
//
Projects.initDB = function()
{	
	Projects.dbInitialized = true;
	var migrations = null;
	var projects = null;
	var runMigration = true;
	var createMigrationTbl = false;
	var createProjectTbl = false;

	try
	{
		// iphone attributes
		try
		{
			var s = TiDev.db.execute('SELECT * FROM IPHONE_ATTRIBUTES');
		}
		catch (e)
		{
			TiDev.db.execute('CREATE TABLE IPHONE_ATTRIBUTES (ID INTEGER, NAME TEXT, VALUE TEXT)');
		}
		// get migrations
		try
		{
			migrations = TiDev.db.execute("SELECT * FROM MIGRATIONS");
		}
		catch(e)
		{
			createMigrationTbl=true;
		}
		
		// get projects
		try
		{
			projects = TiDev.db.execute("SELECT * FROM PROJECTS");
		}
		catch(e)
		{
			createProjectTbl = true;
		}

		// see if project modules exists
		try
		{
			TiDev.db.execute('SELECT * FROM PROJECTMODULES');
		}
		catch(e)
		{
			TiDev.db.execute('CREATE TABLE PROJECTMODULES (guid TEXT, name TEXT, version TEXT)');
		}
		
		// if no migration table, create
		if (createMigrationTbl)
		{
			TiDev.db.execute('CREATE TABLE MIGRATIONS (name TEXT, completed INTEGER)');
		}
		else
		{
			while (migrations.isValidRow())
			{
				if (migrations.fieldByName('name') == 'BETA'  && migrations.fieldByName('completed') == 1)
				{
					runMigration = false;
					break;
				}
				migrations.next();
			}
		}
		
		// create projects table
		if (createProjectTbl)
		{
			runMigration = false;
			
			// create new project table
			TiDev.db.execute("CREATE TABLE PROJECTS (id INTEGER UNIQUE, type TEXT, guid TEXT, runtime TEXT, description TEXT, timestamp REAL, name TEXT, directory TEXT, appid TEXT, publisher TEXT, url TEXT, image TEXT, version TEXT, copyright TEXT)");	    

			// no need to ever run migration - this is a new install
			TiDev.db.execute('INSERT INTO MIGRATIONS (name, completed) values ("BETA",1)');			

		}
		else
		{
			Projects.projectList = [];
			while (projects.isValidRow())
			{

				// delete project if it's directory is not valid
				var dir = Titanium.Filesystem.getFile(projects.fieldByName('directory'));
				if (!dir.exists())
				{
					TiDev.db.execute('DELETE FROM PROJECTS where id = ?',projects.fieldByName('id'));
				}
				//otherwise, record it
				else
				{
					// get modules
					var moduleRows = TiDev.db.execute('SELECT * FROM PROJECTMODULES WHERE guid = ?',projects.fieldByName('guid'));
					var languageModules = {};
					while(moduleRows.isValidRow())
					{
						if (moduleRows.fieldByName('name') == 'ruby')
						{
							languageModules['ruby'] = 'on';
						}
						if (moduleRows.fieldByName('name') == 'python')
						{
							languageModules['python'] = 'on';
						}
						moduleRows.next();
					}
					
					// format date 
					var date = new Date();
					date.setTime(projects.fieldByName('timestamp'));
					var strDate = (date.getMonth()+1)+"/"+date.getDate()+"/"+date.getFullYear();
					
					Projects.projectList.push({
						id:projects.fieldByName('id'),
						guid:projects.fieldByName('guid'),
						runtime:projects.fieldByName('runtime'),
						type:projects.fieldByName('type'),
						description:projects.fieldByName('description'),
						date:strDate,
						name:projects.fieldByName('name'),
						dir:projects.fieldByName('directory'),
						appid:projects.fieldByName('appid'),
						publisher:projects.fieldByName('publisher'),
						url:projects.fieldByName('url'),
						image:projects.fieldByName('image'),
						copyright:projects.fieldByName('copyright'),
						version:projects.fieldByName('version'),
						'languageModules':languageModules
					});

					
					// record highest id - used when creating new records
					if (projects.fieldByName('id') > Projects.highestId)
					{
						Projects.highestId = projects.fieldByName('id');
					}
				}			
				projects.next();
			}
		}
		
		// close DB resources
		if (migrations != null)
		{
			migrations.close();
		}
		if (projects != null)
		{
			projects.close();
		}
		
		// run migration
		if (runMigration == true)
		{
			Projects.runMigrations()
		}
	}
	catch (e)
	{
		alert('Unexpected SQL error on project initialization, message: ' + e);
		return;
	}
	
	
};

//
// Run Data Migration
//
Projects.runMigrations = function()
{
	TiDev.db.execute('DROP TABLE PROJECTS');
	TiDev.db.execute("CREATE TABLE PROJECTS (id INTEGER UNIQUE, type TEXT, guid TEXT, runtime TEXT, description TEXT, timestamp REAL, name TEXT, directory TEXT, appid TEXT, publisher TEXT, url TEXT, image TEXT, version TEXT, copyright TEXT)");	    
	
	for (var i=0;i<Projects.projectList.length;i++)
	{
		var p = Projects.projectList[i];
		var guid = (p.guid == null)? Titanium.Platform.createUUID() :p.guid;
		var type = (p.type == null)?'desktop':p.type
		var version = "1.0";
		var copyright = new Date().getFullYear() + " by " + p['publisher'];
		var runtime = Projects.currentRuntimeVersion;;
		try
		{
			TiDev.db.execute('INSERT INTO PROJECTS (id, type, guid, runtime, description, timestamp, name, directory, appid, publisher, url, image, version, copyright) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
				p['id'],type,guid,runtime,p['desc'],p['date'],p['name'],p['location'],p['appid'],p['publisher'],p['url'],p['image'],version,copyright);
		} 
		catch (e)
		{
			alert('Unexpected SQL error on running migration, message: ' + e);
			return;
		}
	}
	TiDev.db.execute('INSERT INTO MIGRATIONS (name, completed) values ("BETA",1)');

}

//
// Import project click handler
//
Projects.handleImportClick = function()
{
	var props = {multiple:false,directories:true,files:false};
	Titanium.UI.currentWindow.openFolderChooserDialog(function(f)
	{
		if (f.length)
		{
			Projects.importProject(f[0]);
		}
	},
	props);
	
	
}
//
// Import click listener - for main import
//
$('.import_project_button').click(function()
{
	Projects.handleImportClick();
});

//
// Update Android SDK location
//
Projects.updateAndroidSDKLoc = function(loc)
{
	try
	{
		var insert = true;
		var rows = TiDev.db.execute('SELECT * FROM SDKLOCATION');
		while (rows.isValidRow())
		{
			TiDev.db.execute('UPDATE SDKLOCATION SET LOCATION = ?',loc.trim());
			insert = false;
			break;
		}
		if (insert==true)
		{
			TiDev.db.execute('INSERT INTO SDKLOCATION VALUES(?)',loc.trim());
		}
	}
	catch(e)
	{
		TiDev.db.execute('CREATE TABLE SDKLOCATION (LOCATION TEXT)');
		TiDev.db.execute('INSERT INTO SDKLOCATION VALUES(?)',loc.trim());
	}
};
//
// Get Android SDK location
//
Projects.getAndroidSDKLoc = function()
{
	try
	{
		var location = TiDev.db.execute('SELECT LOCATION FROM SDKLOCATION');
		while(location.isValidRow())
		{
			TiDev.androidSDKDir = location.fieldByName('LOCATION');
			return TiDev.androidSDKDir;
		}
	}
	catch(e)
	{
		TiDev.db.execute('CREATE TABLE SDKLOCATION (LOCATION TEXT)');
	}
	return null;
};
//
// Project click handler
//
Projects.handleNewProjectClick = function()
{
	TiDev.contentLeftShowButton.hide();
	TiDev.contentLeftHideButton.hide();
	TiDev.contentLeft.hide();
	TiUI.setBackgroundColor('#1c1c1c');
	TiDev.subtabs.hide();
	$('#tiui_content_submenu').hide();
	$('#tiui_content_body').css('top','53px');
	
	var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('perspectives/projects/new_project.html'));
	$('#tiui_content_right').get(0).innerHTML = file.read();

	// see if we have a mobile sdk
	var sdks = Titanium.Project.getMobileSDKVersions();
	if (TiDev.permissions['mobilesdk'] !='enabled' || sdks.length == 0)
	{
		$('#new_project_type').attr('disabled','true');
		$('#new_project_type').css('backgroundColor','#5a5a5a');
		$('#new_project_type').css('color','#fff');
	}
	else
	{
		$('#new_project_type').removeAttr('disabled');
		$('#new_project_type').css('backgroundColor','#fff');
		$('#new_project_type').css('color','#000');
		
	}
	$('#new_project_frame').fadeIn();
	
	// initialize mobile settings
	if (Projects.hasIPhone == true)
	{
		$('#iphone_sdk_true').css('display','block');
		$('#iphone_sdk_false').css('display','none');
	}
	if (Projects.hasAndroid == true)
	{
		$('#android_sdk_true').css('display','block');
		$('#android_sdk_false').css('display','none');
	}
	
	// handle hint text for appid
	$('#new_project_appid').focus(function()
	{
		if ($(this).val()=='com.companyname.appname')
		{
			$(this).val('');
			$(this).removeClass('hinttext');
		}
	});
	
	// reset dropdown
	$('#new_project_type').val('desktop');
	
	
	// project type listener
	$('#new_project_type').change(function()
	{
		if ($(this).val() == 'mobile')
		{
			var sdkVers = Titanium.Project.getMobileSDKVersions();
			var sdk = Titanium.Project.getMobileSDKVersions(sdkVers[0]);

			// set scripts for current sdk version
			iPhonePrereqPath = Titanium.Filesystem.getFile(sdk.getPath(),'iphone/prereq.py');
			androidPrereqPath = Titanium.Filesystem.getFile(sdk.getPath(),'android/prereq.py');
			
			$('#mobile_platforms').css('display','block');
			$('#desktop_language_modules').css('display','none');

			if (Projects.hasRunMobileCheck == false)
			{
				Projects.hasRunMobileCheck = true;
				
				if (Titanium.platform != 'osx')
				{
					TiDev.setConsoleMessage('Checking for Android prerequisites...');
					checkAndroid();
				}
				else
				{
					TiDev.setConsoleMessage('Checking for iPhone prerequisites...');
					
					// run iphone prereq check
					var iPhoneCheck = TiDev.launchPython(Titanium.Filesystem.getFile(iPhonePrereqPath).toString(),['project']);
					iPhoneCheck.onexit = function(e)
					{
						// success
						if (e == 0)
						{
							// create artifical delay so user can see message
							setTimeout(function()
							{
								$('#iphone_sdk_true').css('display','block');
								$('#iphone_sdk_false').css('display','none');
								
								TiDev.setConsoleMessage('Success!  Now checking for Android...');
								Projects.hasIPhone = true;
								checkAndroid();
							},1000);

						}
						// no XCode
						else if (e == 1)
						{
							alert('XCode is not installed.  It is required for iPhone.');
							TiDev.setConsoleMessage('Checking for Android prerequisites...');
							checkAndroid();
							
						}
						// no 3.0 SDK
						else if (e == 2)
						{
							alert('You must have iPhone SDK 2.2.1 or 3.0.');
							TiDev.setConsoleMessage('Checking for Android prerequisites...');
							checkAndroid();
							
						}
					};
					
				}
				
				// helper function for checking android prereqs
				function checkAndroid()
				{
					if (Projects.getAndroidSDKLoc() != null)
					{
						TiDev.setConsoleMessage('Success!  Android SDK was found.');
						$('#android_sdk_true').css('display','block');
						$('#android_sdk_false').css('display','none');							
						
						setTimeout(function()
						{
							TiDev.resetConsole();
						},2000);
						alert('it worked')
						return;
					
					}
					
					var androidCheck = TiDev.launchPython(Titanium.Filesystem.getFile(androidPrereqPath).toString(),['project']);
					androidCheck.onread = function(e)
					{
						TiDev.androidSDKDir = e.trim();
						Projects.updateAndroidSDKLoc(TiDev.androidSDKDir);
					};
					androidCheck.onexit = function(e)
					{
						if (e == 0)
						{
							Projects.hasAndroid = true;
							$('#android_sdk_true').css('display','block');
							$('#android_sdk_false').css('display','none');							
							setTimeout(function()
							{
								TiDev.setConsoleMessage('Success!  Android SDK was found.');
								setTimeout(function()
								{
									TiDev.resetConsole();
								},2000);
							},1000);
						}
						else if (e ==1)
						{
							TiDev.resetConsole();
							alert('Java not found.  Java is required for Android')
						}
						else if (e == 2)
						{
							TiDev.resetConsole();
							if (confirm('Android SDK 1.5 was not found.  If it is installed, can you provide the location?'))
							{
								var props = {multiple:false,directories:true,files:false};
								Titanium.UI.currentWindow.openFolderChooserDialog(function(f)
								{
									if (f.length)
									{
										// set file and revalidate
										TiDev.androidSDKDir  = f[0];
										Projects.updateAndroidSDKLoc(TiDev.androidSDKDir);
										
										//TODO: validate path
										
										Projects.hasAndroid = true;
										$('#android_sdk_true').css('display','block');
										$('#android_sdk_false').css('display','none');							
										
									}
								},
								props);						
							}
						}
					};
				};
				

			}
		}
		else
		{
			$('#mobile_platforms').css('display','none');
			$('#desktop_language_modules').css('display','block');
			
		}
	})
	// create main buttons
	TiUI.GreyButton({id:'create_project_button'});
	TiUI.GreyButton({id:'cancel_project_button'});


	// create handler
	$('#create_project_button').click(function()
	{
		if($(this).hasClass('disabled')) return;
		if ($('#new_project_type').val() == 'mobile')
		{
			if (Projects.hasIPhone == false && Projects.hasAndroid == false)
			{
				alert('Mobile SDKs not installed.  Please download and install the iPhone SDK 3.0 and/or the Android SDK 1.5.');
				return;
			}
		}
		var options = {};
		options.name = $('#new_project_name').val();
		options.runtime = $('#new_project_runtime').val();
		options.dir = $('#new_project_location').val();
		options.jsLibs = $('#new_project_js').val();
		options.type = $('#new_project_type').val();
		options.url = $('#new_project_url').val();
		options.appid = $('#new_project_appid').val();
		options.iphone = ($('#iphone_sdk_true').css('display') != 'none')?true:false;
		options.android = ($('#android_sdk_true').css('display') != 'none')?true:false;
		options.ruby = ($('#language_ruby_checked').css('display') != 'none')?'on':'';
		options.python = ($('#language_python_checked').css('display') != 'none')?'on':'';
		TiDev.track('project-create',{name:options.name,type:options.type,runtime:options.runtime});
		
		Projects.createProject(options,true);
	});

	$('#cancel_project_button').click(function()
	{
		TiDev.goBack();
	});
	
	// dir listing handler
	$('#new_project_location_icon').click(function()
	{
		var props = {multiple:false,directories:true,files:false};
		Titanium.UI.currentWindow.openFolderChooserDialog(function(f)
		{
			if (f.length)
			{
				// set file and revalidate
				$('#new_project_location').val(f[0]);
				validator();
			}
		},
		props);
		
	});

	//
	// checkbox listeners
	//
	$('#language_ruby').click(function()
	{
		if ($('#language_ruby_checked').css('display') != 'none')
		{
			$('#language_ruby_checked').css('display','none');
			$('#language_ruby_unchecked').css('display','block');
		}
		else
		{
			$('#language_ruby_checked').css('display','block');
			$('#language_ruby_unchecked').css('display','none');
		}	
	});
	$('#language_python').click(function()
	{
		if ($('#language_python_checked').css('display') != 'none')
		{
			$('#language_python_checked').css('display','none');
			$('#language_python_unchecked').css('display','block');
		}
		else
		{
			$('#language_python_checked').css('display','block');
			$('#language_python_unchecked').css('display','none');
		}	
	});

	// form validation
	var validator = TiUI.validator('new_project',function(valid)
	{
		if (valid) 
			$('#create_project_button').removeClass('disabled');
		else
			$('#create_project_button').addClass('disabled');
	});
	
	
	// populate select
	var versions = Titanium.Project.getSDKVersions();
	var html = '';
	for (var i=0;i<versions.length;i++)
	{
		html += '<option value="'+ versions[i] +'">'+ versions[i] +'</option>';
	}
	$('#new_project_runtime').html(html);

	// toggle language modules based on project type
	$('#new_project_type').bind('change',function()
	{
		if ($(this).val() == 'mobile')
		{
			$('#language_modules').addClass('disabled');
			$('#new_project_ruby').attr('disabled','true');
			$('#new_project_python').attr('disabled','true');
			
			// populate select
			var versions = Titanium.Project.getMobileSDKVersions();
			var html = '';
			for (var i=0;i<versions.length;i++)
			{
				html += '<option value="'+ versions[i] +'">'+ versions[i] +'</option>';
			}
			$('#new_project_runtime').html(html);
			
		}
		else
		{
			// populate select
			var versions = Titanium.Project.getSDKVersions();
			var html = '';
			for (var i=0;i<versions.length;i++)
			{
				html += '<option value="'+ versions[i] +'">'+ versions[i] +'</option>';
			}
			$('#new_project_runtime').html(html);
			
			$('#language_modules').removeClass('disabled');
			$('#new_project_ruby').removeAttr('disabled');
			$('#new_project_python').removeAttr('disabled');

		}
	})
	
};

//
// New project click listener
//
$('#new_project_button').click(function()
{
	Projects.handleNewProjectClick();
});

//
// Import a project
//
Projects.importProject = function(f)
{
	var dir = f;
	var file = TFS.getFile(dir,'manifest');
	if (file.exists() == false)
	{
		alert('This directory does not contain valid Titanium project.  Please try again.');
		return;
	}
	
	// create object for DB record
	var options = {};
	options.dir = dir;
	
	// read manifest values to create new db record
	var line = file.readLine(true);
	var entry = Titanium.Project.parseEntry(line);
	for (var i=0;i<1000;i++)
	{
		if (entry == null)
		{
			line = file.readLine();
			if (!line || line == null)break;
			entry = Titanium.Project.parseEntry(line);
		}
		if (entry != null)
		{
			if (entry.key.indexOf('appname') != -1)
			{
				options.name = entry.value;
			}
			else if (entry.key.indexOf('publisher') != -1)
			{
				options.publisher = entry.value;
			}
			else if (entry.key.indexOf('url') != -1)
			{
				options.url = entry.value;
			}
			else if (entry.key.indexOf('image') != -1)
			{
				options.image = entry.value;
			}
			else if (entry.key.indexOf('appid') != -1)
			{
				options.appid = entry.value;
			}
			else if (entry.key.indexOf('guid') != -1)
			{
				options.guid = entry.value;
			}
			else if (entry.key.indexOf('desc') != -1)
			{
				options.desc = entry.value;
			}
			else if (entry.key.indexOf('type') != -1)
			{
				options.type = entry.value;
			}
			else if (entry.key.indexOf('ruby') != -1)
			{
				options.ruby = 'on';
			}
			else if (entry.key.indexOf('python') != -1)
			{
				options.python = 'on';
			}
			
		}

		entry = null;
	}
	// if no description, create
	if (!options.description)
	{
		options.description = options.name + ' is a cool new app created by ' + options.publisher;
	}

	// if no guid, create
	if (!options.guid)
	{
		options.guid = Titanium.Platform.createUUID();
	}
	
	// ALWAYS SET TO CURRENT RUNTIME (FOR BETA RELEASE)
	options.runtime = Projects.currentRuntimeVersion;
	
	// if not type - default to desktop
	if (!options.type)
	{
		options.type = 'desktop';
	}
	TiDev.track('project-import',{guid:options.guid,name:options.name});

	Projects.createProject(options);
	
	// show message
	TiDev.setConsoleMessage('Your project has been imported',2000);
	
};

//
// Create a project record in the DB and update array cache
//
Projects.createProject = function(options, createProjectFiles)
{
	// create project object
	var date = new Date();
	options.date = (date.getMonth()+1)+"/"+date.getDate()+"/"+date.getFullYear();
	options.publisher = (options.publisher)?options.publisher:Titanium.Platform.username;
	options.url = (options.url)?options.url:'';
	options.image = (options.image)?options.image:'default_app_logo.png';
	options.guid = (options.guid)?options.guid:Titanium.Platform.createUUID();
	options.desc = (options.desc)?options.desc:'No description provided';
	options.id = options.appid;
	options.version = "1.0";
	options.copyright = date.getFullYear() + ' by ' + options.publisher;
	
	// normal names 
	var normalizedName = options.name.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
	normalizedName = normalizedName.replace(/ /g,'_').toLowerCase();
	var normalizedPublisher = options.publisher.replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
	normalizedPublisher = normalizedPublisher.replace(/ /g,'_').toLowerCase();
	
	var record = {
		name: options.name,
		dir: options.dir,
		id: ++Projects.highestId,
		appid: options.id,
		date: options.date,
		publisher:options.publisher,
		url:options.url,
		image:options.image,
		guid:options.guid,
		description:options.desc,
		runtime: options.runtime,
		type:(options.type)?options.type:'desktop',
		version:options.version,
		copyright:options.copyright,
		'languageModules':{'ruby':options.ruby,'python':options.python}
	};

	// create project directories
	if (createProjectFiles == true)
	{
		var result = {};
		if (options.type == 'desktop')
		{
		 	result = Titanium.Project.create(options);
			if (result.success==true)
			{
				result = createDBRecord();
				writeAppTextFiles();
			}
			setMessage();
		}
		else
		{
			// see if directory already exists
			if (Titanium.Filesystem.getFile(options.dir,options.name).exists() == true)
			{
				result.message = 'Directory already exists: ' +Titanium.Filesystem.getFile(options.dir,options.name).toString();
				setMessage();
			}
			else
			{
				var args = [options.name , options.id, options.dir];
				if (options.iphone == true)
				{
					args.push('iphone');
				}
				if (options.android==true)
				{
					args.push('android');
					args.push('"' + TiDev.androidSDKDir.trim() + '"');
				}

				TiDev.setConsoleMessage('Creating mobile project: ' + options.name);

				// determine path to project create script
				var sdk = Titanium.Project.getMobileSDKVersions(options.runtime);
				var path = Titanium.Filesystem.getFile(sdk.getPath(),'project.py');
				var	x = TiDev.launchPython(Titanium.Filesystem.getFile(path).toString(),args);
				x.onexit = function(e)
				{
					if (e!=0)
					{
						result.message = 'Error creating project.  Please try again.';
						setMessage();
					}
					else
					{
						result['success'] = true;
						options.image = 'appicon.png';
						record.image = 'appicon.png';
						Titanium.Project.createMobileResources(options);
						setMessage();
						createDBRecord();
						writeAppTextFiles();
						
					}
				};
			}
		}
		
	}
	else
	{
		// create db record
		result = createDBRecord();
		setMessage();
	}
	
	function writeAppTextFiles()
	{
		var license = Titanium.Filesystem.getFile(options.dir,options.name,'LICENSE.txt');
		var changelog = Titanium.Filesystem.getFile(options.dir,options.name,'CHANGELOG.txt');
		license.write('Place your license text here.  This file will be incorporated with your app at package time.');
		changelog.write('Place your change log text here.  This file will be incorporated with your app at package time.');
		
	};
	function setMessage()
	{
		var message = 'Project "'+record.name+'" was created.';
		var delay = 2000;
		if (result.success == false)
		{
			message = 'Project creation error: ' + result.message;
			delay = 5000;
		}
		// show message
		TiDev.setConsoleMessage(message,delay);

	};
	
	function createDBRecord()
	{
		// add name to dir if new project
		if (createProjectFiles == true)
		{
			record['dir'] = Titanium.Filesystem.getFile(options.dir,options.name).toString();
		}

		var result = {};
		// create project record
		try
		{
			// insert record and push into cache
		    TiDev.db.execute("INSERT INTO PROJECTS (id, type, runtime, guid, description,timestamp, name, directory, appid, publisher, url, image,version,copyright) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)", record.id,record.type,record.runtime,record.guid,record.description,date.getTime(),record.name,record.dir,record.appid,record.publisher,record.url,record.image,record.version,record.copyright);	
			Projects.projectList.push(record);
			if (record['languageModules'].ruby == 'on')
			{
			    TiDev.db.execute("INSERT INTO PROJECTMODULES (guid, name, version) VALUES (?, ?, ?)", record.guid, 'ruby',Projects.currentRuntimeVersion);	
			}
			if (record['languageModules'].python == 'on')
			{
			    TiDev.db.execute("INSERT INTO PROJECTMODULES (guid, name, version) VALUES (?, ?, ?)", record.guid, 'python',Projects.currentRuntimeVersion);	
			}
			result =  {success:true};
		}
		catch (e)
		{
			result =  {success:false,message:'Unexpected SQL error inserting project, message ' + e};
		}

		Projects.selectedProjectIdx = record.id

		if (TiDev.activePerspective.name != 'projects')
		{
			TiDev.perspectiveChange(0);
		}
		Projects.setupView();
		return result;

	};

}

//
// Register perspective
//
TiDev.registerPerspective({
	name:'projects',
	active:true,
	image:'perspectives/projects/images/projects.png',
	activeImage:'perspectives/projects/images/projects_active.png',
	imageTitle:'Projects',
	html:'projects.html',
	callback:Projects.eventHandler,
	idx:0,
	views:[]
});