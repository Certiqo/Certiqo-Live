App = {
  web3Provider: null,
  contracts: {},
  chairPerson: null,
  currentAccount: "0x0000000000000000000000000000000000000000",
  currentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  nextHash: null,
  address:'0x1fE5C0f6b4552866D2101041E85eE18331C437e9',       // >> Paste contract address on this line <<
  drugData: {},

  init: async function () {

    window.ethereum.on('accountsChanged', async function (accounts) {
      // Time to reload the interface with accounts[0]!
      await App.poupulateAddress(App.populateBalance);
    })
    return await App.initWeb3();
  },

  initWeb3: async function () {

    /// Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      window.ethereum.autoRefreshOnNetworkChange = false;
      try {
          // Request account access
          await window.ethereum.enable();
      } catch (error) {
          // User denied account access...
          console.error("User denied account access")
      }
    }

    // Legacy dapp browsers...
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }

    App.poupulateAddress(App.populateBalance);
    return App.initContract();
  },

  poupulateAddress: function (populateBalance) {
    web3 = new Web3(App.web3Provider);

    // Retrieving accounts
    web3.eth.getAccounts(function(err, res) {
        if (err) {
            console.log('Error:',err);
            return;
        }
        // console.log('Current Account:',res);
        App.currentAccount = res[0];
        $("#current-account").text(res[0]);
        App.populateBalance();
    })
  },

  populateBalance: function () {
    web3 = new Web3(App.web3Provider);

    // Retrieve balance
    web3.eth.getBalance(App.currentAccount,(b,r)=>{
      $('#balance').text(web3.fromWei(parseInt(r)));
    })
  },

  initContract: function () {
    App.contracts.certiqo = web3.eth.contract(App.abi).at(App.address)
    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on("submit", "#FDA-register-form", App.handleRegister);
    $(document).on("submit", "#FDA-unregister-form", App.handleUnregister);
    $(document).on("submit", "#FDA-approve-form", App.handleApprove);
    $(document).on("submit", "#FDA-suspend-form", App.handleSuspend);
    $(document).on("submit", "#public-status-form", App.handleStatus);
    $(document).on("submit", "#mftr-manufacture-form", App.handleManufacture);
    $(document).on("submit", "#mftr-dispatch-form", App.handleDispatchToDistr);
    $(document).on("submit", "#distr-receive-form", App.handleReceiveFromMftr);
    $(document).on("submit", "#distr-dispatch-form", App.handleDispatchToPhar);
    $(document).on("submit", "#phar-receive-form", App.handleReceiveFromDistr);
    $(document).on("submit", "#phar-dispense-form", App.handleDispense);
    $(document).on("click", '#hash-sync', App.handleSync);
  },  

  //Function to handle the registration of an airline
  //Should get a deposit amount from the airline
  handleRegister: function (event) {
    event.preventDefault();
    
    var _address = $("#FDA-register-address").val();
    var _role = null;
    if (document.getElementById('FDA-register-type1').checked){
      _role = 1;
    }else if (document.getElementById('FDA-register-type2').checked){
      _role = 2;
    }else if (document.getElementById('FDA-register-type3').checked){
      _role = 3;
    }else if (document.getElementById('FDA-register-type4').checked){
      _role = 4;
    }

    App.contracts.certiqo.register(_address, _role, { from:  App.currentAccount }, (err, res) => {
      if(!err){
        function pendingConfirmation() {
          web3.eth.getTransactionReceipt(res, (err,receipt) => {
            if(receipt){
              clearInterval(myInterval);

              if(parseInt(receipt.status) == 1){
                toastr.success("Registration Successful");
              }
              else{
                toastr.error("Error in Registration. Transaction Reverted!");
              }
            }
            if(err){
              clearInterval(myInterval);
              console.log(err);
            }
          })
        }
        const myInterval = setInterval(pendingConfirmation, 3000);
      }
      else if (err.message.indexOf('User already registered') != -1){
        toastr.error("Transaction Failed: User already registered !");
      }
      else if (err.message.indexOf('Access Denied') != -1){
        toastr.error("Access denied: only FDA can perform this operation !");
      }
      else{
        toastr.error("Transaction Failed !");
      }
    })
  },

  handleUnregister: function (event) {
    event.preventDefault();
    var _address = $("#FDA-unregister-address").val();

    App.contracts.certiqo.unregister(_address, { from:  App.currentAccount }, (err, res) => {
      if(!err){
        function pendingConfirmation() {
          web3.eth.getTransactionReceipt(res, (err,receipt) => {
            if(receipt){
              clearInterval(myInterval);

              if(parseInt(receipt.status) == 1){
                toastr.success("User Unregistered");
              }
              else{
                toastr.error("Error occurred during Unregistration. Transaction Reverted!");
              }
            }
            if(err){
              clearInterval(myInterval);
              console.log(err);
            }
          })
        }
        const myInterval = setInterval(pendingConfirmation, 3000);
      }
      else if (err.message.indexOf('Operation Failed') != -1){
        toastr.error("Transaction Failed: User is not registered !");
      }
      else if (err.message.indexOf('Access Denied') != -1){
        toastr.error("Access denied: only FDA can perform this operation !");
      }
      else{
        toastr.error("Transaction Failed !");
      }
    })
  },

  handleApprove: async function (event) {
    event.preventDefault();

    // prefetch
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    var _ndc = $("#FDA-approve-ndc").val();
    var _name = $("#FDA-approve-name").val();
    var _type = $("#FDA-approve-type").val();
    var _date = month + "-" + date + "-" + year;

    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    // construction
    var toAdd = {
      ndc: "",
      name: "",
      type: "",
      status: "",
      approvalDate: "",
      manufacturer: "",
      mftrSalePrice: "",
      distributor: "",
      distrSalePrice: "",
      pharmacist: "",
      pharSalePrice: ""
    };

    if(App.drugData === null){    // First addition
      toAdd.ndc = _ndc;
      toAdd.name = _name;
      toAdd.type = _type;
      toAdd.status = "Approved";
      toAdd.approvalDate = _date;
    }
    else{                         // Edit data
      toAdd = App.drugData;
      toAdd.approvalDate = _date;
      toAdd.status = "Approved";
    }

    // Init transaction
    var toAdd_obj = {data: toAdd};
    App.contracts.certiqo.approveDrug(_ndc, App.currentHash, { from:  App.currentAccount }, (err, res) => {
      if(!err){
        function pendingConfirmation() {
          web3.eth.getTransactionReceipt(res, (err,receipt) => {
            if(receipt){
              clearInterval(myInterval);

              if(parseInt(receipt.status) == 1){
                toastr.success("Drug Approved");
                App.updateDB(toAdd_obj);
                App.updateHash();
              }
              else{
                toastr.error("Error occurred during approval. Transaction Reverted!");
              }
            }
            if(err){
              clearInterval(myInterval);
              console.log(err);
            }
          })
        }
        const myInterval = setInterval(pendingConfirmation, 3000);
      }
      else if (err.message.indexOf('File hash error') != -1){
        toastr.error("Transaction Failed: File db error. Revert to old version !");
      }
      else if (err.message.indexOf('Access Denied') != -1){
        toastr.error("Access denied: only FDA can perform this operation !");
      }
      else{
        toastr.error("Transaction Failed !");
      }
    })       
    
  },

  handleSuspend: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#FDA-suspend-ndc").val();
    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "Hold";
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      App.contracts.certiqo.suspendDrug(_ndc, App.currentHash, { from:  App.currentAccount }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Suspended");
                  App.updateDB(toAdd_obj);
                  App.updateHash();
                }
                else{
                  toastr.error("Error occurred during Hold. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only FDA can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleStatus: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#public-status-ndc").val();

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){
      toastr.error("NDC not valid !");
    }
    else {
      $("#public-ndc").text(App.drugData.ndc);
      $("#public-name").text(App.drugData.name);
      $("#public-type").text(App.drugData.type);

      if(App.drugData.status === "Approved"){
        $("#public-currentStatus").text("Approved by FDA");
      }else if(App.drugData.status === "Hold"){
        $("#public-currentStatus").text("Hold !");
        toastr.warning("Drug Suspended by FDA!");
      }else if(App.drugData.status === "Manufactured"){
        $("#public-currentStatus").text("Manufactured");
      }else if(App.drugData.status === "MftrDispatched"){
        $("#public-currentStatus").text("Manufacturer Dispatched");
      }else if(App.drugData.status === "DistrReceived"){
        $("#public-currentStatus").text("Distributor Received");
      }else if(App.drugData.status === "DistrDispatched"){
        $("#public-currentStatus").text("Distributor Dispatched");
      }else if(App.drugData.status === "PharReceived"){
        $("#public-currentStatus").text("Pharmacist Received");
      }else if(App.drugData.status === "Dispensed"){
        $("#public-currentStatus").text("Dispensed");
      }

      $("#public-date").text(App.drugData.approvalDate);
      $("#public-mftr").text(App.drugData.manufacturer);
      $("#public-distr").text(App.drugData.distributor);
      $("#public-phar").text(App.drugData.pharmacist);
      $("#public-price").text(App.drugData.pharSalePrice);
    }
    
  },

  handleManufacture: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#mftr-manufacture-ndc").val();
    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "Manufactured";
      toAdd.manufacturer = App.currentAccount;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      App.contracts.certiqo.manufactureDrug(_ndc, App.currentHash, { from:  App.currentAccount }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Manufactured");
                  App.updateDB(toAdd_obj);
                  App.updateHash();
                }
                else{
                  toastr.error("Error occurred during Manufacture. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not approved') != -1){
          toastr.error("Warning: Drug not approved yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Manufacturer can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleDispatchToDistr: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#mftr-dispatch-ndc").val();
    var _price = $("#mftr-dispatch-price").val();
    var _temp = web3.toWei(_price, "wei");

    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "MftrDispatched";
      toAdd.mftrSalePrice = _temp;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      App.contracts.certiqo.dispatchToDistributor(_ndc, _temp, App.currentHash, { from:  App.currentAccount }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Dispatched to Distributor");
                  App.updateDB(toAdd_obj);
                  App.updateHash();
                }
                else{
                  toastr.error("Error occurred during Dispatch. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not manufactured') != -1){
          toastr.error("Warning: Drug not manufactured yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Manufacturer can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleReceiveFromMftr: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#distr-receive-ndc").val();
    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "DistrReceived";
      toAdd.distributor = App.currentAccount;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      var _price = toAdd.mftrSalePrice;
      App.contracts.certiqo.receiveFromManuacturer(_ndc, App.currentHash, { from:  App.currentAccount, value: web3.toWei(_price, "wei") }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Received from Manufacturer");
                  App.updateDB(toAdd_obj);
                  App.updateHash();                  
                }
                else{
                  toastr.error("Error occurred during Receive. Transaction Reverted!");
                  console.log(parseInt(receipt.status));
                  console.log(receipt.status);
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not dispatched by manufacturer') != -1){
          toastr.error("Warning: Drug not dispatched yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Distributor can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleDispatchToPhar: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#distr-dispatch-ndc").val();
    var _price = $("#distr-dispatch-price").val();
    var _temp = web3.toWei(_price, "wei");

    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "DistrDispatched";
      toAdd.mftrSalePrice = _temp;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      App.contracts.certiqo.dispatchToPharmacist(_ndc, _temp, App.currentHash, { from:  App.currentAccount }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Dispatched to Pharmacist");
                  App.updateDB(toAdd_obj);
                  App.updateHash();                
                }
                else{
                  toastr.error("Error occurred during Dispatch. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not received by distributor') != -1){
          toastr.error("Warning: Drug not received yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Distributor can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleReceiveFromDistr: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#phar-receive-ndc").val();
    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "PharReceived";
      toAdd.pharmacist = App.currentAccount;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      var _price = toAdd.mftrSalePrice;

      App.contracts.certiqo.receiveFromDistributor(_ndc, App.currentHash, { from:  App.currentAccount, value: web3.toWei(_price, "wei") }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Received from Distributor");
                  App.updateDB(toAdd_obj);
                  App.updateHash();
                }
                else{
                  toastr.error("Error occurred during Receive. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not dispatched by distributor') != -1){
          toastr.error("Warning: Drug not dispatched yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Pharmacist can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleDispense: async function (event) {
    event.preventDefault();

    // prefetch
    var _ndc = $("#phar-dispense-ndc").val();
    var _price = $("#phar-dispense-price").val();
    var _temp = web3.toWei(_price, "wei");

    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });

    // verification
    var ndc_obj = {ndc: _ndc};
    await $.post("/drugDetails", ndc_obj, function (data, status) {
      if(status === "success"){
        if(data === ""){
          App.drugData = null;
        }
        else{
          App.drugData = data;
        }
      }
    });

    if(App.drugData === null){    // Error !!
      toastr.error("NDC not valid !");
    }
    else{                         // Edit data
      
      // construction
      var toAdd = {
        ndc: "",
        name: "",
        type: "",
        status: "",
        approvalDate: "",
        manufacturer: "",
        mftrSalePrice: "",
        distributor: "",
        distrSalePrice: "",
        pharmacist: "",
        pharSalePrice: ""
      };
      toAdd = App.drugData;
      toAdd.status = "Dispensed";
      toAdd.pharSalePrice = _temp;
  
      // Init transaction
      var toAdd_obj = {data: toAdd};
      App.contracts.certiqo.dispenseToConsumer(_ndc, _temp, App.currentHash, { from:  App.currentAccount }, (err, res) => {
        if(!err){
          function pendingConfirmation() {
            web3.eth.getTransactionReceipt(res, (err,receipt) => {
              if(receipt){
                clearInterval(myInterval);

                if(parseInt(receipt.status) == 1){
                  toastr.success("Drug Dispensed to Consumer");
                  App.updateDB(toAdd_obj);
                  App.updateHash();
                }
                else{
                  toastr.error("Error occurred during Dispense. Transaction Reverted!");
                }
              }
              if(err){
                clearInterval(myInterval);
                console.log(err);
              }
            })
          }
          const myInterval = setInterval(pendingConfirmation, 3000);
        }
        else if (err.message.indexOf('File hash error') != -1){
          toastr.error("Transaction Failed: File db error. Revert to old version !");
        }
        else if (err.message.indexOf('Drug not received by pharmacist') != -1){
          toastr.error("Warning: Drug not received yet !");
        }
        else if (err.message.indexOf('Access Denied') != -1){
          toastr.error("Access denied: only Pharmacist can perform this operation !");
        }
        else{
          toastr.error("Transaction Failed !");
        }
      })
    } 
  },

  handleSync: async function (event) {
    event.preventDefault();

    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });
    
    App.contracts.certiqo.updateHash(App.currentHash, { from:  App.currentAccount }, (err, res) => {
      if(!err){
        toastr.success("Hash updated successfully");
      }
      else{
        toastr.error("Failed to update file hash!");
      }  
    });
  },

  updateHash: async function (){
    await $.get("/currentHash", function (data, status) {
      if(status === "success"){
          App.currentHash = data;
      }
    });
    
    App.contracts.certiqo.updateHash(App.currentHash, { from:  App.currentAccount }, (err, res) => {
      if(!err){
        toastr.success("Hash updated successfully");
      }
      else{
        toastr.error("Failed to update file hash!");
      }  
    });
  },

  updateDB: function (toAdd_obj){
    $.post("/updateDB", toAdd_obj, function (data, status) { 
      if(status === "success"){
         console.log("**  File updated  **"); 
      } 
    });
  },

  "abi": [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "hash",
          "type": "bytes32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "Approved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "Dispensed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "DistrDispatched",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "DistrReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "Hold",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "Manufactured",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "MftrDispatched",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "PharReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "Registered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "Unregistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        },
        {
          "internalType": "enum Certiqo.role",
          "name": "R",
          "type": "uint8"
        }
      ],
      "name": "register",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "unregister",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "approveDrug",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "suspendDrug",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "manufactureDrug",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "dispatchToDistributor",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "receiveFromManuacturer",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function",
      "payable": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "dispatchToPharmacist",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function",
      "payable": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "receiveFromDistributor",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function",
      "payable": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        }
      ],
      "name": "dispenseToConsumer",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function",
      "payable": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "m_address",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "d_address",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "p_address",
          "type": "address"
        }
      ],
      "name": "verifyDrug",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "statusCode",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ndc",
          "type": "uint256"
        }
      ],
      "name": "getStatus",
      "outputs": [
        {
          "internalType": "enum Certiqo.State",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_nexthash",
          "type": "bytes32"
        }
      ],
      "name": "updateHash",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],

};

$(function () {
  $(window).load(function () {
    App.init();
    //Notification UI config
    toastr.options = {
      showDuration: "800",
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: true,
      closeButton: true,
    };
  });
});


