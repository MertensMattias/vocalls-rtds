//==================================================================================================
// api - factory config
//==================================================================================================
apiConfigMap = new Map([
    // sendSMS api
    [
        'sendSMS',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var smsApi = `${base}/smsapi-${varObj.environment}`;
            return {
                endpoint: `${smsApi}/api/Send`,
                method: 'POST',
                queryParameters: '',
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {
                    smsAccountId: 47,
                    routing: 'DEV',
                    from: '8850',
                    to: '0478306999',
                    content:
                        'Voici le lien vers notre formulaire de contact : www.engie-vianeo.com/contact',
                    channel: 'sms',
                },
                dataToRetrieve: {},
            };
        },
    ],
    // Scheduler
    [
        'schedulingApi',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var schedulingapi = `${base}/schedulingapi-${varObj.environment}`;
            return {
                endpoint: `${schedulingapi}/api/Schedule/${segmentState.params.schedulerId}/status`,
                method: 'GET',
                queryParameters: `?date=${encodeURI(segmentState.params.schedulerDate)}`,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: {},
            };
        },
    ],

    // Segment logging (endpoint is already correct; body built above)
    [
        'segmentLogApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var ivrapi = `${base}/ivrapi-${varObj.environment}`;
            var body = createSegmentLogBody(varObj, segmentState);
            return {
                endpoint: ivrapi + '/api/SegmentLog',
                method: 'POST',
                queryParameters: '',
                timeout: 15000,
                headers: _headers,
                jsonReqBody: body,
                dataToRetrieve: {},
            };
        },
    ],

    // REMOVED: Deprecated EventLogApiConfig - replaced by new logger system

    // Key logging (reverted/simple)
    [
        'logVarApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var ivrapi = `${base}/ivrapi-${varObj.environment}`;
            var body = logVar(varObj, varObj.addKeysToLog, true);
            Logger.debug('addKeysToLog: ' + JSON.stringify(addKeysToLog));

            return {
                endpoint: ivrapi + '/api/KeyLog',
                method: 'POST',
                queryParameters: '',
                timeout: 15000,
                headers: _headers,
                jsonReqBody: body,
                dataToRetrieve: {},
            };
        },
    ],

    // cdbLogging
    [
        'cdbLcApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            return {
                endpoint: `${iris}/api/IVR_ContactDatabase/logContact`,
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    operationCallData: createOperationCallData(
                        varObj.customer.customerCA,
                        varObj.customer.customerBP,
                        varObj.language
                    ),
                    callID: varObj.callIdKey,
                    ani: varObj.ani,
                    dnis: varObj.dnis,
                    sessionStartTime: varObj.cdb.cdbSessionStartTime || varObj.interactionStartTime,
                    selfServiceStartTime: varObj.cdb.cdbSelfServiceStartTime || nowUTC(),
                    selfServiceEndTime: nowUTC() || null,
                    endpointDicID: varObj.cdb.cdbDicId || null,
                    endPointPlaceHolderList:
                        buildCdbPlaceholders(varObj, 'cdb.cdbPlaceHolders') || [],
                    offeredAlertID: varObj.cdb.cdbOfferedAlertID || null,
                    transferType1: null,
                    transferType2: null,
                    transferReason: null,
                    canFinalizeContact: false,
                },
                dataToRetrieve: {},
            };
        },
    ],
    [
        'cdbLcFcApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            return {
                endpoint: `${iris}/api/IVR_ContactDatabase/logContact`,
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    operationCallData: createOperationCallData(
                        varObj.customer.customerCA,
                        varObj.customer.customerBP,
                        varObj.language
                    ),
                    callID: varObj.callIdKey,
                    ani: varObj.ani,
                    dnis: varObj.dnis,
                    sessionStartTime: varObj.cdb.cdbSessionStartTime || varObj.interactionStartTime,
                    selfServiceStartTime: varObj.cdb.cdbSelfServiceStartTime || nowUTC(),
                    selfServiceEndTime: nowUTC() || null,
                    endpointDicID: varObj.cdb.cdbDicId || null,
                    endPointPlaceHolderList:
                        buildCdbPlaceholders(varObj, 'cdb.cdbPlaceHolders') || [],
                    offeredAlertID: null,
                    transferType1: null,
                    transferType2: null,
                    transferReason: null,
                    canFinalizeContact: true,
                },
                dataToRetrieve: {},
            };
        },
    ],

    [
        'cdbFcApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            return {
                endpoint: `${iris}/api/IVR_ContactDatabase/logContact`,
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    operationCallData: createOperationCallData(
                        varObj.customer.customerCA,
                        varObj.customer.customerBP,
                        varObj.language
                    ),
                    callID: varObj.callIdKey,
                    ani: varObj.ani,
                    dnis: varObj.dnis,
                    sessionStartTime: varObj.cdb.cdbSessionStartTime || varObj.interactionStartTime,
                    selfServiceStartTime: null,
                    selfServiceEndTime: null,
                    endpointDicID: null,
                    endPointPlaceHolderList: [],
                    offeredAlertID: null,
                    transferType1: null,
                    transferType2: null,
                    transferReason: null,
                    canFinalizeContact: true,
                },
                dataToRetrieve: {},
            };
        },
    ],

    // CDB Log Contact (without finalization) - Custom logging function
    [
        'cdbLogContactApiConfig',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            return {
                endpoint: `${iris}/api/IVR_ContactDatabase/logContact`,
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    operationCallData: createOperationCallData(
                        varObj.customer.customerCA,
                        varObj.customer.customerBP,
                        varObj.language
                    ),
                    callID: varObj.callIdKey,
                    ani: varObj.ani,
                    dnis: varObj.dnis,
                    sessionStartTime: varObj.cdb.cdbSessionStartTime || varObj.interactionStartTime,
                    selfServiceStartTime: varObj.cdb.cdbSelfServiceStartTime || nowUTC(),
                    selfServiceEndTime: nowUTC() || null,
                    endpointDicID: varObj.cdb.cdbDicId || null,
                    endPointPlaceHolderList:
                        buildCdbPlaceholders(varObj, 'cdb.cdbPlaceHolders') || [],
                    offeredAlertID: varObj.cdb.cdbOfferedAlertID || null,
                    transferType1: null,
                    transferType2: null,
                    transferReason: null,
                    canFinalizeContact: false,
                },
                dataToRetrieve: {},
            };
        },
    ],

    [
        'getTransferNumberWithTensionLevel',
        (varObj, segmentState) => {
            var base = 'https://api.n-allo.be';
            var iris = base + '/iris-repository-ivr-' + varObj.environment;

            var qp =
                '?guid=' +
                createUUID() +
                '&language=' +
                encodeURIComponent(varObj.language) +
                '&businessPartnerId=' +
                encodeURIComponent(varObj.customer.customerBP) +
                '&contractAccountId=' +
                encodeURIComponent(varObj.customer.customerCA) +
                '&origin=' +
                encodeURIComponent(segmentState.segmentConfig.origin) +
                '&reason=' +
                encodeURIComponent(segmentState.segmentConfig.reason) +
                '&callId=' +
                encodeURIComponent(varObj.callIdKey) +
                '&tensionLevel=' +
                encodeURIComponent(varObj.customer.transferTension.transferTensionLevel);

            return {
                endpoint: iris + '/api/IVR_Profiling/GetTransferNumberWithTensionLevel',
                method: 'GET',
                queryParameters: qp,
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {},
            };
        },
    ],

    /*     // getTransferNumberWithTensionLevel
    ['getTransferNumberWithTensionLevel', (varObj) => {
        var base = 'https://api.n-allo.be';
        var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
        var ani0 = varObj.ani.replace(/^\+\d{1,2}/, '0');
        var qp = `?guid=${createUUID()}`
            + `&language=${encodeURIComponent(varObj.language)}`
            + `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}`
            + `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`
            + `&origin=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'gtwtOrigin']))}`;
        + `&reason=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'gtwtReason']))}`;
        + `&callId=${encodeURIComponent(varObj.callIdKey)}`
            + `&tensionLevel=${encodeURIComponent(varObj.customer.giTransferTensionLevel)}`;
        return {
            endpoint: `${iris}/api/IVR_Profiling/GetTransferNumberWithTensionLevel`,
            method: 'GET',
            queryParameters: qp,
            timeout: 20000,
            headers: _headers,
            jsonReqBody: {}
        };
    }], */

    // SSVAANP/SSVAPA/SSVAAP aka adaptAmount
    [
        'getSSVAAOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE006_AdaptBBP/FindAdaptAmountFullEligibilityAndOptions`,
                method: 'GET',
                queryParameters: qp,
                timeout: 30000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'getSSVAANPOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE006_AdaptBBP/FindAdaptAmountNonProtocolEligibilityAndOptions`,
                method: 'GET',
                queryParameters: qp,
                timeout: 30000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'getSSVIWPDOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE001_PaymentDelay/VerifyCustomerEligibility`,
                method: 'GET',
                queryParameters: qp,
                timeout: 30000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'createPaymentDeferral',
        function (varObj, segmentState) {
            var base = 'https://api.n-allo.be';
            var iris = base + '/iris-repository-ivr-' + varObj.environment;

            var currentSegment = segmentState && segmentState.currentSegment;
            var toolData =
                varObj && varObj._tempData && currentSegment && varObj._tempData[currentSegment]
                    ? varObj._tempData[currentSegment]
                    : {};
            var actionData =
                toolData && toolData.runtimeVars && toolData.runtimeVars.actionData
                    ? toolData.runtimeVars.actionData
                    : {};
            var financialTransactionIDList = actionData.financialTransactionIDList || [];

            return {
                endpoint: iris + '/api/IVR_FE001_PaymentDelay/CreatePaymentDeferral',
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    guid: createUUID(),
                    language: varObj.language,
                    businessPartnerId: varObj.customer.customerBP,
                    contractAccountId: varObj.customer.customerCA,
                    financialTransactionIDList: financialTransactionIDList,
                },
                dataToRetrieve: {},
            };
        },
    ],

    [
        'createInstallmentPlan',
        function (varObj, segmentState) {
            var base = 'https://api.n-allo.be';
            var iris = base + '/iris-repository-ivr-' + varObj.environment;

            var currentSegment = segmentState && segmentState.currentSegment;
            var toolData =
                varObj && varObj._tempData && currentSegment && varObj._tempData[currentSegment]
                    ? varObj._tempData[currentSegment]
                    : {};
            var actionData =
                toolData && toolData.runtimeVars && toolData.runtimeVars.actionData
                    ? toolData.runtimeVars.actionData
                    : {};

            var financialTransactionIDList = actionData.financialTransactionIDList || [];
            var startDate = actionData.day_of_month || '';
            var sliceCount = actionData.installmentSlices || 0;
            var applyCost = actionData.installmentApplyCost || false;

            return {
                endpoint: iris + '/api/IVR_FE001_PaymentDelay/CreateInstallmentPlan',
                method: 'POST',
                queryParameters: '',
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {
                    guid: createUUID(),
                    language: varObj.language,
                    businessPartnerId: varObj.customer.customerBP,
                    contractAccountId: varObj.customer.customerCA,
                    financialTransactionIDList: financialTransactionIDList,
                    startDate: startDate,
                    sliceCount: sliceCount,
                    applyCost: applyCost,
                },
                dataToRetrieve: {},
            };
        },
    ],

    // send mail - ssviwpd
    [
        'sendMailPaymentDelay',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/PushMarketingSegmentCustomerToWebSendEmail`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVDUP (Duplicate invoice)
    [
        'getSSVDUPOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE008_DuplicateInvoice/VerifyDuplicateInvoice`,
                method: 'GET',
                queryParameters: qp,
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccured' } },
            };
        },
    ],

    //TODO: define parameters documentId, documentReprintMode and documentReprintType
    [
        'sendDuplicateInvoice',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&documentId=` +
                `&documentReprintMethod=` +
                `&documentReprintType=`;
            return {
                endpoint: `${iris}/api/IVR_FE008_DuplicateInvoice/SendDuplicate`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVAA (Adapt amount)

    [
        'adaptAmount',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&newAmount=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'aaProvidedAmount']))}`;
            return {
                endpoint: `${iris}/api/IVR_FE006_AdaptBBP/AdaptAmount`,
                method: 'POST',
                queryParameters: qp,
                timeout: 30000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'getSSVAPAOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE006_AdaptBBP/FindAdaptProposedAmountEligibilityAndOptions`,
                method: 'GET',
                queryParameters: qp,
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccured' } },
            };
        },
    ],

    [
        'adaptProposedAmount',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&newAmount=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'aaProvidedAmount']))}`;
            return {
                endpoint: `${iris}/api/IVR_FE006_AdaptBBP/AdaptProposedAmount`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccured' } },
            };
        },
    ],

    // Payment Delay
    [
        'getSSVIWPDOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE001_PaymentDelay/VerifyCustomerEligibility`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVIM
    [
        'getSSVIMOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE066_MoveInfo/FindMoveInfo`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'sendInfoMoveMail',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE066_MoveInfo/SendInfoMoveMail`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVMEI
    [
        'getSSVMEIOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE054_EInvoicing/FindEInvoicingStatusResult`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'updateEInvoicingStatus',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&activateEInvoicing=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'gpActivateEInvoicing']))}`;
            return {
                endpoint: `${iris}/api/IVR_FE054_EInvoicing/UpdateEInvoicingStatus`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVSMI
    [
        'getSSVSMIOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;

            return {
                endpoint: `${iris}/api/IVR_FE011_SimulateMyInvoice/FindSimulateMyInvoiceInfo`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'sendSimulateMyInvoiceMail',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;

            return {
                endpoint: `${iris}/api/IVR_FE011_SimulateMyInvoice/SendSimulateMyInvoiceMail`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVMD
    [
        'getSSVMDOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE087_AdaptMasterData/FindAdaptMasterDataInfoResult`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVSST
    [
        'getSSVSSTOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE021_SocialTariff/FindSocialTariffInfo`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'createSocialTariffLetterPrint',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE021_SocialTariff/CreateSocialTariffLetterPrint`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccurred: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // SSVIWAR
    [
        'getSSVIWAROptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE032_IWantARefund/GetIWARStatus`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'updateFinancialMasterDataAndSendLetter',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&iban=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'iwarIban']))}`;
            return {
                endpoint: `${iris}/api/IVR_FE032_IWantARefund/UpdateFinancialMasterDataAndSendLetter`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'sendIwarLetter',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_FE032_IWantARefund/SendLetter`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'updateIwarValidity',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&bankDetailsId=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'iwarBankDetailsId']))}`;
            return {
                endpoint: `${iris}/api/IVR_FE032_IWantARefund/UpdateValidity`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // send mail - pushCustomerToWeb
    [
        'pushCustomerToWebSendEmail',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/PushCustomerToWebSendEmail`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // send mail - PushMarketingSegmentCustomerToWebSendEmail
    [
        'pushMarketingSegmentCustomerToWebSendEmail',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}&template=DIRECT`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/PushMarketingSegmentCustomerToWebSendEmail`,
                method: 'POST',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    [
        'getSSVNBDOptions',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&isPartialExpected=${encodeURIComponent(getTempValue(['_tempData', segmentState.currentSegment, 'isPartialExpected']))}`;

            return {
                endpoint: `${iris}/api/IVR_FE009_IDidNotReceive/FindNextBillingDate`,
                method: 'GET',
                queryParameters: qp,
                timeout: 15000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // IDENTIFICATION get Profile
    [
        'updateMasterDataPhoneNumber',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var ani0 = varObj.ani.replace(/^\+\d{1,2}/, '0');
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}` +
                `&phoneNumber=${encodeURIComponent(ani0)}`;
            return {
                endpoint: `${iris}/api/IVR_MasterData/UpdatePhoneNumber`,
                method: 'POST',
                queryParameters: qp,
                timeout: 20000,
                headers: _headers,
                jsonReqBody: {},
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccured' } },
            };
        },
    ],

    // IDENTIFICATION get Profile
    [
        'getProfileByContractAccountID',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&businessPartnerId=${encodeURIComponent(varObj.customer.customerBP)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/GetProfileByContractAccountID`,
                method: 'GET',
                queryParameters: qp,
                timeout: 25000,
                headers: _headers,
                jsonReqBody: null,
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccured' } },
            };
        },
    ],
    // IDENTIFICATION on CLID
    [
        'getIdentificationOnCLID',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var ani0 = varObj.ani.replace(/^\+\d{1,2}/, '0');
            var qp = `?guid=${createUUID()}&language=${encodeURIComponent(varObj.language)}&clid=${encodeURIComponent(ani0)}`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/GetIdentificationOnCLID`,
                method: 'GET',
                queryParameters: qp,
                timeout: 25000,
                headers: _headers,
                jsonReqBody: null,
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],

    // IDENTIFICATION on Contract Account
    [
        'getIdentificationOnContractAccount',
        (varObj) => {
            var base = 'https://api.n-allo.be';
            var iris = `${base}/iris-repository-ivr-${varObj.environment}`;
            var qp =
                `?guid=${createUUID()}` +
                `&language=${encodeURIComponent(varObj.language)}` +
                `&contractAccountId=${encodeURIComponent(varObj.customer.customerCA)}`;
            return {
                endpoint: `${iris}/api/IVR_Profiling/GetIdentificationOnContractAccount`,
                method: 'GET',
                queryParameters: qp,
                timeout: 25000,
                headers: _headers,
                jsonReqBody: null,
                dataToRetrieve: { failureOccured: { dataType: 'bool', name: 'failureOccurred' } },
            };
        },
    ],
]);

//==================================================================================================
// Helpers
//==================================================================================================
function getTempValue(path, fallback) {
    if (typeof fallback === 'undefined') fallback = '';
    try {
        var value = varObj;
        for (var i = 0; i < path.length; i++) {
            if (value[path[i]] == null) return fallback;
            value = value[path[i]];
        }
        return value;
    } catch (_) {
        return fallback;
    }
}

/**
 * Generates a UUID (v4) string.
 */
function createUUID() {
    var hexDigits = '0123456789abcdef';
    var s = [];

    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4';
    s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
}

/**
 * Indicates whether the HTTP method should have a request body.
 * Minimal, conservative set: POST, PUT, PATCH.
 */
function requiresRequestBody(method) {
    var m = (method || '').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH';
}

function createApiRequest(apiConfigType, varObj, segmentState) {
    if (typeof apiConfigType !== 'string') {
        return Promise.resolve({
            success: false,
            skipped: false,
            error: 'apiConfigType must be a string',
            statusCode: null,
            response: null,
            endpoint: null,
        });
    }

    var factory = apiConfigMap.get(apiConfigType);
    if (typeof factory !== 'function') {
        return Promise.resolve({
            success: false,
            skipped: true,
            error: 'Unknown API type',
            statusCode: null,
            response: null,
            endpoint: null,
        });
    }

    var cfg;
    try {
        cfg = factory(varObj, segmentState);
    } catch (e) {
        Logger.error(
            'createApiRequest: Factory function threw error for ' + apiConfigType,
            {
                apiConfigType: apiConfigType,
                endpoint: null,
            },
            e
        );
        return Promise.resolve({
            success: false,
            skipped: false,
            error: e && e.message ? e.message : String(e),
            statusCode: null,
            response: null,
            endpoint: null,
        });
    }
    if (typeof cfg !== 'object' || typeof cfg.method !== 'string') {
        return Promise.resolve({
            success: false,
            skipped: false,
            error: 'Invalid API config',
            statusCode: null,
            response: null,
            endpoint: cfg && cfg.endpoint ? cfg.endpoint : null,
        });
    }
    if (!cfg || typeof cfg.endpoint !== 'string' || typeof cfg.method !== 'string') {
        return Promise.resolve({
            success: false,
            skipped: false,
            error: 'Invalid API config',
            statusCode: null,
            response: null,
            endpoint: cfg && cfg.endpoint ? cfg.endpoint : null,
        });
    }
    if (!/^https?:\/\/[\w.-]+/.test(cfg.endpoint)) {
        return Promise.resolve({
            success: false,
            skipped: false,
            error: 'Malformed endpoint URL',
            statusCode: null,
            response: null,
            endpoint: cfg.endpoint,
        });
    }

    var query = cfg.queryParameters || '';
    var url = cfg.endpoint + (query && !query.startsWith('?') ? '?' + query : query);
    var options = {
        method: cfg.method.toUpperCase(),
        timeout: cfg.timeout || 15000,
    };

    if (requiresRequestBody(options.method) && cfg.jsonReqBody === null) {
        Logger.info('createApiRequest: skipped', {
            apiConfigType: apiConfigType,
            method: options.method,
            endpoint: url,
        });
        return Promise.resolve({
            success: true,
            skipped: true,
            error: 'request skipped',
            statusCode: null,
            response: null,
            endpoint: url,
        });
    }

    var body = cfg.jsonReqBody || {};
    Logger.debug('createApiRequest: request body', { body: body });
    var t0 = Date.now();

    return jsonHttpRequest(
        url,
        options,
        _headers,
        options.method === 'GET' ? undefined : body
    ).then(
        function (result) {
            var ms = Date.now() - t0;
            var status = Logger.getStatusCode(result);
            var resultErrorObj = null;
            if (result && result.error) {
                resultErrorObj =
                    typeof result.error === 'object'
                        ? result.error
                        : { message: String(result.error) };
            }

            var ctx = {
                endpoint: url,
                method: options.method,
                status: status,
                duration: ms,
                extras: { factoryResult: Logger.sanitizeForLog(result) },
            };
            Logger.API('createApiRequest ' + apiConfigType, ctx, resultErrorObj);

            return {
                success: result.success,
                skipped: false,
                error: result.error,
                statusCode: status,
                response: result.response,
                endpoint: result.endpoint || url,
            };
        },
        function (err) {
            var ms = Date.now() - t0;
            // format message consistently and pass original err so logger can capture stack
            Logger.API(
                'createApiRequest for ' + apiConfigType + ' failed',
                {
                    endpoint: url,
                    method: options.method,
                    status: null,
                    duration: ms,
                },
                err
            );
            return {
                success: false,
                skipped: false,
                error: err && err.message ? err.message : String(err),
                statusCode: null,
                response: null,
                endpoint: url,
            };
        }
    );
}

function executeApiCall(apiConfigType, varObj, segmentState) {
    Logger.info('executeApiCall: start', { apiConfigType: apiConfigType });
    try {
        var promise = createApiRequest(apiConfigType, varObj, segmentState);
        if (!promise || typeof promise.then !== 'function') {
            return Promise.resolve(promise);
        }
        return promise.then(function (result) {
            if (result && result.skipped) {
                Logger.info('executeApiCall for ' + apiConfigType + ': skipped', {
                    reason: result.error,
                    endpoint: result.endpoint,
                });
            } else if (result && result.success) {
                Logger.info('executeApiCall for ' + apiConfigType + ': success', {
                    statusCode: result.statusCode,
                    endpoint: result.endpoint,
                });
            } else {
                // Let logger handle error object conversion
                Logger.error(
                    'executeApiCall for ' + apiConfigType + ': failure',
                    {
                        endpoint: result && result.endpoint,
                        statusCode: result && result.statusCode,
                    },
                    result && result.error
                );
            }
            return result;
        });
    } catch (err) {
        Logger.error(
            'executeApiCall for ' + apiConfigType + ': exception occurred',
            {
                endpoint: null,
            },
            err
        );
        return Promise.resolve({
            success: false,
            skipped: false,
            error: err && err.message ? err.message : String(err),
            statusCode: null,
            response: null,
            endpoint: null,
        });
    }
}

/**
 * logVar – extract and diff key/value pairs from varObj.
 * Returns a uniform result with success/skipped/error/data and logs the
 * extraction process and final outcome.
 */
function logVar(varObj, extraKeysToLog, comparePrevious, keyNameMapping) {
    Logger.info('logVar: start', {
        extraKeysToLog: extraKeysToLog,
        comparePrevious: comparePrevious,
    });
    if (!Array.isArray(extraKeysToLog)) extraKeysToLog = [];
    if (!keyNameMapping) keyNameMapping = {};
    var defaultKeys = Array.isArray(varObj.defaultKeysToLog) ? varObj.defaultKeysToLog : [];
    var finalKeys = defaultKeys.concat(extraKeysToLog);

    if (finalKeys.length === 0) {
        Logger.info('logVar: no keys to process');
        return null;
    }

    var extracted = {};
    for (var i = 0; i < finalKeys.length; i++) {
        var key = finalKeys[i];
        var value = getNestedValue(varObj, key);
        if (value === 'undefined') value = undefined;
        if (value !== null && value !== undefined && value !== '') {
            extracted[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        }
    }

    if (Object.keys(extracted).length === 0) {
        Logger.warn('logVar: no valid key-values extracted');
        return null;
    }

    var changed = [];
    if (comparePrevious) {
        var previous = varObj._previousKeyValueData ? JSON.parse(varObj._previousKeyValueData) : {};
        for (var k in extracted) {
            if (extracted.hasOwnProperty(k) && extracted[k] !== previous[k]) {
                changed.push({
                    name: keyNameMapping[k] || k,
                    value: String(extracted[k]),
                });
            }
        }
        varObj._previousKeyValueData = JSON.stringify(extracted);
    } else {
        for (var k2 in extracted) {
            if (extracted.hasOwnProperty(k2)) {
                changed.push({
                    name: keyNameMapping[k2] || k2,
                    value: String(extracted[k2]),
                });
            }
        }
    }

    if (changed.length === 0) {
        Logger.info('logVar: no changes detected');
        return null;
    }

    Logger.info('logVar: extracted keys', { keysCount: changed.length });
    return {
        callIdKey: varObj.callIdKey || 'UNKNOWN',
        routingId: varObj.routingId || 'DEFAULT_FLOW',
        keys: changed,
    };
}

/**
 * createSegmentLogBody – build a DTO from segmentState.log.
 * Returns a uniform result with success/skipped/error/data and logs the
 * start and any exceptional conditions.
 */
function createSegmentLogBody(varObj, segmentState) {
    Logger.info('createSegmentLogBody: start', {
        logEntries: segmentState && segmentState.log ? segmentState.log.length : 0,
    });
    if (!segmentState || !Array.isArray(segmentState.log) || segmentState.log.length === 0) {
        Logger.warn('createSegmentLogBody: no segments to log');
        return null;
    }

    var entries = segmentState.log.slice(); // chronological
    var firstEnd = entries[0] && entries[0].timestamp ? entries[0].timestamp : null;
    var firstStart =
        varObj && varObj.interactionStartTime
            ? varObj.interactionStartTime
            : firstEnd
              ? firstEnd
              : nowUTC();

    var starts = [];
    var ends = [];
    var i;
    starts[0] = firstStart;
    for (i = 0; i < entries.length; i++) {
        var ts = entries[i] && entries[i].timestamp ? entries[i].timestamp : nowUTC();
        ends[i] = ts;
    }
    for (i = 1; i < entries.length; i++) {
        starts[i] = ends[i - 1];
    }
    for (i = 0; i < entries.length - 1; i++) {
        ends[i] = starts[i + 1];
    }

    var segments = [];
    for (i = 0; i < entries.length; i++) {
        var item = entries[i] || {};
        segments.push({
            segmentName: item.currentSegment || null,
            segmentResult: item.segmentResult || null,
            nextSegment: item.nextSegment || null,
            segmentObj: item.params ? JSON.stringify(item.params) : null,
            segmentType: item.segmentType || null,
            startTimestamp: starts[i],
            endTimestamp: ends[i],
            createdBy: '',
        });
    }

    Logger.info('createSegmentLogBody: built DTO', { segmentsCount: segments.length });
    return {
        callIdKey: varObj.callIdKey,
        routingId: varObj.routingId,
        segments: segments,
    };
}

/************************************************************
 * Planning – build an ordered API call plan
 ************************************************************/
function buildApiCallPlan(varObj, segmentState, overridePlan) {
    var defaultPlan = [
        'logVarApiConfig',
        'cdbFcApiConfig',
        'cdbLcFcApiConfig',
        'segmentLogApiConfig',
    ];

    var plan = Array.isArray(overridePlan) ? overridePlan.slice() : defaultPlan.slice();
    var exclude = [];

    if (!varObj || !varObj.logVarActive) {
        exclude.push('logVarApiConfig');
        Logger.info('onCallEnd: KeyLog disabled');
    } else {
        Logger.info('onCallEnd: KeyLog enabled');
    }

    if (!varObj || !varObj.logSegmentActive) {
        exclude.push('segmentLogApiConfig');
        Logger.info('onCallEnd: SegmentLog disabled');
    } else {
        Logger.info('onCallEnd: SegmentLog enabled');
    }

    var cdbActive = varObj && varObj.logCdbActive;
    if (cdbActive) {
        varObj.cdb = varObj.cdb || {};
        try {
            varObj.cdb.cdbDicId = resolveCdbDicId(cdbLog, varObj);
        } catch (e) {
            if (!varObj.cdb) varObj.cdb = {};
            varObj.cdb.cdbDicId = null;
            Logger.warn(
                'onCallEnd: getCdbDicId failed, treating as no DicId: ' +
                    (e && e.message ? e.message : String(e))
            );
        }

        Logger.info('onCallEnd: CDB evaluation', {
            cdbDicId: varObj.cdb.cdbDicId,
            cdbFcFinished: varObj.cdb.cdbFcFinished,
        });

        if (varObj.cdb && varObj.cdb.cdbFcFinished === true) {
            // Already finalized earlier → skip both
            exclude.push('cdbFcApiConfig');
            exclude.push('cdbLcFcApiConfig');
        } else if (varObj.cdb && !varObj.cdb.cdbFcFinished) {
            if (varObj.cdb.cdbDicId) {
                // Have log data → do combined log+finalize; skip finalize-only
                exclude.push('cdbFcApiConfig');
            } else {
                // No log data → do finalize-only; skip combined
                exclude.push('cdbLcFcApiConfig');
            }
        }
    } else {
        exclude.push('cdbFcApiConfig');
        exclude.push('cdbLcFcApiConfig');
        Logger.info('onCallEnd: CDB disabled');
    }

    var seen = {};
    var filtered = [];
    for (var i = 0; i < plan.length; i++) {
        var key = plan[i];
        if (exclude.indexOf(key) !== -1) continue;
        if (!seen[key]) {
            seen[key] = true;
            filtered.push(key);
        }
    }

    var idx = filtered.indexOf('segmentLogApiConfig');
    if (idx > -1 && idx !== filtered.length - 1) {
        filtered.splice(idx, 1);
        filtered.push('segmentLogApiConfig');
    }

    Logger.info('onCallEnd: request plan built', { final: filtered, excluded: exclude });
    return filtered;
}

/************************************************************
 * Dispatcher – simple and explicit execution
 ************************************************************/

/**
 * Optional preflight skip based on state alone (no factory access).
 * - Skip SegmentLog if no entries present.
 * - Other types → allow executeApiCall/factory handle gracefully.
 */
function shouldSkipByState(type, varObj, segmentState) {
    if (type === 'segmentLogApiConfig') {
        if (!segmentState || !Array.isArray(segmentState.log) || segmentState.log.length === 0) {
            Logger.info('runApiPlan: skipping SegmentLog (no entries)');
            return true;
        }
    }
    return false;
}

/**
 * Log CDB contact with cdbDicId (non-finalizing)
 * Returns Promise<{success, skipped, error, statusCode, response}>
 * Validation: customer.customerCA, customer.customerBP, cdb.cdbDicId OR cdb.cdbLog
 * State: Sets cdbLcFinished=true, calls resetCdbState() on success, resets flag on failure
 */
function logCdbContact(varObj, segmentState) {
    if (varObj && varObj.cdb && varObj.cdb.cdbLcFinished) {
        return Promise.resolve({
            success: true,
            skipped: true,
            error: null,
            statusCode: null,
            response: null,
        });
    }
    Logger.info('logCdbContact: varObj initial state' + JSON.stringify(varObj));
    Logger.info('logCdbContact: segmentState initial state' + JSON.stringify(segmentState));

    if (!varObj.cdb) varObj.cdb = {};
    varObj.cdb.cdbLcFinished = true;

    var customerCA = varObj && varObj.customer && varObj.customer.customerCA;
    var customerBP = varObj && varObj.customer && varObj.customer.customerBP;
    if (!customerCA || !customerBP) {
        varObj.cdb.cdbLcFinished = false;
        Logger.error(
            'logCdbContact: Missing customer data',
            {
                customerCA: customerCA || 'missing',
                customerBP: customerBP || 'missing',
            },
            null
        );
        return Promise.resolve({
            success: false,
            skipped: false,
            error: 'Missing customer data',
            statusCode: null,
            response: null,
        });
    }

    var cdbDicId = null;
    if (varObj.cdb.cdbDicId) {
        cdbDicId = varObj.cdb.cdbDicId;
    } else if (varObj.cdb.cdbLog) {
        cdbDicId = resolveCdbDicId(varObj.cdb.cdbLog, varObj);
    }

    if (!cdbDicId || cdbDicId === '') {
        varObj.cdb.cdbLcFinished = false;
        return Promise.resolve({
            success: true,
            skipped: true,
            error: null,
            statusCode: null,
            response: null,
        });
    }

    return executeApiCall('cdbLogContactApiConfig', varObj, segmentState).then(
        function (result) {
            if (result.success && result.statusCode === 200) {
                Logger.API('logCdbContact: Success', { cdbDicId: cdbDicId }, null);
                resetCdbState(varObj);
                return {
                    success: true,
                    skipped: false,
                    error: null,
                    statusCode: result.statusCode,
                    response: result.response,
                };
            }
            varObj.cdb.cdbLcFinished = false;
            Logger.error(
                'logCdbContact: Unsuccessful',
                { statusCode: result.statusCode, error: result.error },
                null
            );
            return {
                success: false,
                skipped: false,
                error: result.error || 'API call unsuccessful',
                statusCode: result.statusCode,
                response: result.response,
            };
        },
        function (error) {
            varObj.cdb.cdbLcFinished = false;
            Logger.error('logCdbContact: Failed', { cdbDicId: cdbDicId }, error);
            return {
                success: false,
                skipped: false,
                error: error.message || 'API call failed',
                statusCode: null,
                response: null,
            };
        }
    );
}

function resetCdbState(varObj) {
    if (!varObj) return;
    varObj.cdb = varObj.cdb || {};
    varObj.cdb.cdbDicId = null;
    varObj.cdb.cdbLog = null;
    varObj.cdb.cdbFcFinished = !!varObj.cdb.cdbFcFinished;
    // If you track combined finished separately, align here (example):
    if (varObj.cdb.cdbLcFinished !== undefined) varObj.cdb.cdbLcFinished = false;
    if (varObj.cdb.cdbLcFcFinished !== undefined)
        varObj.cdb.cdbLcFcFinished = !!varObj.cdb.cdbLcFcFinished;
}

function runApiPlanAwait(plan, varObj, segmentState, totalTimeoutMs) {
    if (!Array.isArray(plan) || plan.length === 0) {
        // Return a resolved thenable (tiny noop task) so callers can still `return` it.
        return Promise.resolve({ success: true, skipped: true, emptyPlan: true });
    }

    var i = -1;
    function runNext(prevResult) {
        i++;

        while (i < plan.length) {
            var type = plan[i];
            if (shouldSkipByState(type, varObj, segmentState)) {
                i++;
                continue;
            }

            var task;
            try {
                task = executeApiCall(type, varObj, segmentState); // must return thenable
            } catch (e) {
                Logger.error('runApiPlanAwait: executeApiCall threw', {
                    apiConfigType: type,
                    error: e && e.message ? e.message : String(e),
                });
                i++;
                continue;
            }

            if (!task || typeof task.then !== 'function') {
                Logger.warn('runApiPlanAwait: executeApiCall did not return a task for ' + type, {
                    apiConfigType: type,
                });
                i++;
                continue;
            }

            return task.then(
                function (result) {
                    if (type === 'segmentLogApiConfig' && result && result.success) {
                        Logger.info(
                            'runApiPlanAwait: SegmentLog succeeded → clearing segmentState.log'
                        );
                        segmentState.log = [];
                    }

                    if (
                        (type === 'cdbFcApiConfig' || type === 'cdbLcFcApiConfig') &&
                        result &&
                        result.success
                    ) {
                        Logger.info(
                            'runApiPlanAwait: CDB finalize succeeded → set cdbFcFinished=true'
                        );
                        if (!varObj.cdb) varObj.cdb = {};
                        varObj.cdb.cdbFcFinished = true;

                        if (type === 'cdbLcFcApiConfig') {
                            resetCdbState(varObj);
                            if (!varObj.cdb) varObj.cdb = {};
                            varObj.cdb.cdbFcFinished = true;
                        }
                    }

                    return runNext(result);
                },
                function (err) {
                    Logger.error('runApiPlanAwait: transport error for ' + type, {
                        error: err && err.message ? err.message : String(err),
                    });
                    return runNext({
                        success: false,
                        skipped: false,
                        error: err && err.message ? err.message : String(err),
                        statusCode: null,
                    });
                }
            );
        }

        return Promise.resolve(prevResult);
    }

    var chainTask = runNext(null);

    if (chainTask && typeof chainTask.withTimeout === 'function') {
        return chainTask.withTimeout(totalTimeoutMs || 60000);
    }
    return chainTask;
}

function runApiPlan(plan, varObj, segmentState) {
    if (!Array.isArray(plan) || plan.length === 0) return;

    for (var i = 0; i < plan.length; i++) {
        (function (type) {
            if (shouldSkipByState(type, varObj, segmentState)) return;

            var task;
            try {
                task = executeApiCall(type, varObj, segmentState);
            } catch (e) {
                Logger.error('runApiPlan: executeApiCall threw', {
                    apiConfigType: type,
                    error: e && e.message ? e.message : String(e),
                });
                return;
            }

            if (!task || typeof task.then !== 'function') {
                // Defensive: executeApiCall must return thenable in this design
                Logger.warn('runApiPlan: executeApiCall did not return a task for ' + type, {
                    apiConfigType: type,
                });
                return;
            }

            // Per-type success hooks
            task = task.then(
                function (result) {
                    // Result is expected shape: { success, skipped?, statusCode?, response?, error? }
                    if (type === 'segmentLogApiConfig' && result && result.success) {
                        Logger.info('runApiPlan: SegmentLog succeeded → clearing segmentState.log');
                        segmentState.log = [];
                    }

                    if (
                        (type === 'cdbFcApiConfig' || type === 'cdbLcFcApiConfig') &&
                        result &&
                        result.success
                    ) {
                        Logger.info('runApiPlan: CDB finalize succeeded → set cdbFcFinished=true');
                        if (!varObj.cdb) varObj.cdb = {};
                        varObj.cdb.cdbFcFinished = true;

                        // If this was the combined log+finalize, reset CDB state as requested
                        if (type === 'cdbLcFcApiConfig') {
                            resetCdbState(varObj);
                            if (!varObj.cdb) varObj.cdb = {};
                            // Keep the finished flag after reset
                            varObj.cdb.cdbFcFinished = true;
                        }
                    }

                    return result;
                },
                function (err) {
                    Logger.error('runApiPlan: transport error for ' + type, {
                        error: err && err.message ? err.message : String(err),
                    });
                    return {
                        success: false,
                        skipped: false,
                        error: err && err.message ? err.message : String(err),
                        statusCode: null,
                    };
                }
            );

            // Bound the task time if supported; do not return it to flow
            if (typeof task.withTimeout === 'function') {
                try {
                    task.withTimeout(30000);
                } catch (e2) {}
            } else {
                // Not a Vocalls task? still attach a terminal catch to avoid unhandled rejections
                task.then(
                    function () {
                        /* noop */
                    },
                    function () {
                        /* logged above */
                    }
                );
            }
        })(plan[i]);
    }
}

/************************************************************
 * Main – onCallEnd
 ************************************************************/

function shouldSkipFinalization(varObj) {
    return varObj && (varObj.redirect || varObj._onCallEndDone === true);
}

function markFinalizationDone(varObj) {
    if (!varObj) return;
    varObj._onCallEndDone = true;
}

function safeVarObj() {
    if (typeof varObj === 'object' && varObj !== null) return varObj;
    return {};
}

function safeSegmentState() {
    if (typeof segmentState === 'object' && segmentState !== null) return segmentState;
    return { log: [] };
}

function onSessionEnd(vObj, seg, overridePlan) {
    Logger.info('!!!onSessionEnd!!! => INITIATED');
}

function onCallResult(vObj, seg, overridePlan) {
    Logger.info('!!!onCallResult!!! => INITIATED');
}

/************************************************************
 * onCallEnd
 ************************************************************

/**
 * Main entry: invoked when the call ends.
 * @param {object} vObj - Variable object (optional override)
 * @param {object} seg - Segment state (optional override)
 * @param {array} overridePlan - Optional API plan override
 * @returns {Promise} API execution promise
 */
function onCallEnd(vObj, seg, overridePlan) {
    var varObjLocal = safeVarObj();
    var segmentStateLocal = safeSegmentState();

    if (shouldSkipFinalization(varObjLocal)) {
        Logger.info('onCallEnd: skipped – redirect or already finalised');
        return;
    }

    markFinalizationDone(varObjLocal);

    if (!Array.isArray(segmentStateLocal.log)) segmentStateLocal.log = [];

    var speakFlowObj =
        typeof speakFlow !== 'undefined'
            ? speakFlow
            : typeof context !== 'undefined' && context.speakFlow
              ? context.speakFlow
              : null;

    if (typeof SpeechHistoryManager !== 'undefined' && speakFlowObj && varObjLocal) {
        SpeechHistoryManager.collectNew(varObjLocal, segmentStateLocal, speakFlowObj);
    }

    var currentSegment = segmentStateLocal.currentSegment;
    var currentSegmentType = segmentStateLocal.segmentType || 'standard';
    var isLocalDisconnect = currentSegmentType === 'termination';

    var callState, effectiveSegmentResult;

    if (isLocalDisconnect) {
        Logger.info('onCallEnd: LOCAL disconnect (planned termination)');
        Logger.info('onCallEnd: currentSegment = ' + currentSegment + ' (termination segment)');

        effectiveSegmentResult = segmentStateLocal.segmentResult || 'SUCCESS';

        var segmentConfig = segmentDic.get(currentSegment);
        if (segmentConfig && segmentConfig.SUCCESS && segmentConfig.SUCCESS.params) {
            callState = segmentConfig.SUCCESS.params.callState || 'localDisconnect';
        } else {
            callState = 'localDisconnect';
        }
    } else {
        Logger.info('onCallEnd: REMOTE disconnect (unplanned interruption)');
        Logger.info(
            'onCallEnd: interruptedSegment = ' + currentSegment + ' (' + currentSegmentType + ')'
        );

        effectiveSegmentResult = 'INTERRUPTED';
        callState = 'remoteDisconnect';
    }

    var segmentSpeech = null;
    if (typeof SpeechHistoryManager !== 'undefined' && varObjLocal) {
        segmentSpeech = SpeechHistoryManager.getSegmentSpeech(
            varObjLocal,
            segmentStateLocal,
            'compact'
        );
    }

    var logParams = cloneObject(segmentStateLocal.params || {});
    logParams.callState = callState;

    if (segmentSpeech && typeof segmentSpeech === 'string' && segmentSpeech.length > 0) {
        logParams.speech = segmentSpeech;
    }

    var loggedSegment, loggedResult, loggedSegmentType;

    if (isLocalDisconnect) {
        loggedSegment = currentSegment;
        loggedResult = 'SUCCESS';
        loggedSegmentType = 'termination';
    } else {
        loggedSegment = currentSegment;
        loggedResult = 'INTERRUPTED';
        loggedSegmentType = currentSegmentType;
    }

    segmentStateLocal.log.push({
        currentSegment: loggedSegment,
        segmentResult: loggedResult,
        nextSegment: null,
        segmentType: loggedSegmentType,
        params: logParams,
        timestamp: nowUTC(),
    });

    Logger.info('onCallEnd: Call terminated', {
        segment: loggedSegment,
        result: loggedResult,
        type: loggedSegmentType,
        callState: callState,
        disconnectType: isLocalDisconnect ? 'LOCAL' : 'REMOTE',
    });

    if (
        typeof Logger !== 'undefined' &&
        Logger &&
        Logger.config &&
        Logger.config.bufferEnabled &&
        Logger.config.bufferFlushOnCallEnd
    ) {
        var buffer = Logger.getBuffer ? Logger.getBuffer() : null;
        var bufferSizeBeforeFlush = buffer ? buffer.length : 0;
        var bufferContents = buffer ? buffer.slice(0) : []; // Clone buffer for logging

        if (Logger.config.activeLevel === 'DEBUG') {
            Logger.debug('onCallEnd: Flushing logger buffer', {
                bufferSize: bufferSizeBeforeFlush,
                bufferContents: bufferContents,
            });
        }
        var loggerRef = Logger;
        Logger.flushBuffer().then(
            function (result) {
                Logger.info('Logger flushed buffer');
            },
            function (error) {
                if (typeof loggerRef !== 'undefined' && loggerRef && loggerRef.warn) {
                    loggerRef.warn(
                        'onCallEnd: Logger buffer flush failed',
                        {
                            bufferSizeBefore: bufferSizeBeforeFlush,
                            bufferContents: bufferContents,
                            error: error ? error.message || String(error) : 'Unknown error',
                        },
                        error
                    );
                }
            }
        );
    }

    if (typeof segmentState === 'object' && segmentState !== null) {
        segmentState.log = segmentStateLocal.log;
        segmentState.currentSegment = loggedSegment;
        segmentState.segmentResult = loggedResult;
        segmentState.segmentType = loggedSegmentType;
        segmentState.nextSegment = null;
    } else {
        Logger.warn('onCallEnd: segmentState is null, cannot update global reference');
    }

    var plan = buildApiCallPlan(varObjLocal, segmentStateLocal, overridePlan);
    return runApiPlanAwait(plan, varObjLocal, segmentStateLocal, 60000);
}

function classifyRemoteAddress(target) {
    // Normalize input
    var raw = target === null || target === undefined ? '' : String(target).trim();

    // Internal "line:" (be forgiving with spaces/case)
    var isLine = /^line\s*:/i.test(raw);
    if (isLine) {
        // Keep the original spacing; also return a normalized compact version if you like
        var compact = raw.replace(/\s+/g, '');
        return {
            transferType: 'internal',
            classification: 'local',
            normalized: compact, // e.g., "line:123"
            original: raw,
            valid: true,
        };
    }

    // Remove common formatting characters for digit-based checks
    var cleaned = raw.replace(/[\s\-\.\(\)]/g, '');

    // Early invalids
    if (cleaned.length === 0 || !/^[+0-9]+$/.test(cleaned)) {
        return {
            transferType: 'external',
            classification: 'invalid',
            normalized: cleaned,
            original: raw,
            valid: false,
        };
    }

    // Internal short numeric extension: 1–6 digits
    if (/^\d{1,6}$/.test(cleaned)) {
        return {
            transferType: 'internal',
            classification: 'local',
            normalized: cleaned,
            original: raw,
            valid: true,
        };
    }

    // Helper: convert to E.164 if possible
    var toE164 = (s) => {
        // Convert 00 prefix to +
        if (s.startsWith('00')) s = '+' + s.slice(2);
        // Remove optional "(0)" after +32 variants was already stripped; handle "+32(0)" styles:
        s = s.replace(/\+32\(0\)/, '+32');
        return s;
    };

    // Build an E.164 candidate
    var e164 = toE164(cleaned);

    // Belgium detection
    var isPlus = e164.startsWith('+');
    var BE_CC = '+32';

    // If local BE national format like 04xxxxxxxx or 0XXXXXXXXX/XXXX:
    var isBELocalTrunk = /^0\d{8,9}$/.test(cleaned);

    // Convert BE trunk to E.164
    if (isBELocalTrunk) {
        // 0xxxxxxxxx/xxxxxxxxx -> +32xxxxxxxx
        // Remove the leading 0 and prepend +32
        e164 = BE_CC + cleaned.slice(1);
    }

    // If started with + or 00, e164 now has +. If not Belgium trunk and not +, it's likely invalid international/national
    if (!e164.startsWith('+') && !isBELocalTrunk) {
        // Might be a malformed number like "32..." without +/00/0
        return {
            transferType: 'external',
            classification: 'invalid',
            normalized: cleaned,
            original: raw,
            valid: false,
        };
    }

    // Classify Belgium vs other country
    var isBelgium = e164.startsWith(BE_CC);

    // BE mobile (E.164): +324[5-9]xxxxxxx (total 12 chars including +32)
    var isMobileBE = /^\+324[5-9]\d{7}$/.test(e164);

    if (isBelgium) {
        if (isMobileBE) {
            return {
                transferType: 'external',
                classification: 'mobile',
                normalized: e164, // canonical E.164
                original: raw,
                country: 'BE',
                valid: true,
            };
        }
        // Non-mobile Belgium; allow +32 followed by 8–9 digits (service + geographic)
        // e.g., +3212345678 (area code length varies)
        if (/^\+32\d{8,9}$/.test(e164)) {
            return {
                transferType: 'external',
                classification: 'national',
                normalized: e164,
                original: raw,
                country: 'BE',
                valid: true,
            };
        }

        // BE but malformed length
        return {
            transferType: 'external',
            classification: 'invalid',
            normalized: e164,
            original: raw,
            country: 'BE',
            valid: false,
        };
    }

    // International (non-BE) – basic validation: "+" then at least country code + 6 digits
    if (/^\+\d{7,15}$/.test(e164)) {
        return {
            transferType: 'external',
            classification: 'international',
            normalized: e164,
            original: raw,
            valid: true,
        };
    }

    // Fallback invalid
    return {
        transferType: 'external',
        classification: 'invalid',
        normalized: e164,
        original: raw,
        valid: false,
    };
}

/* function classifyRemoteAddress(target) {
    var s = (target === null || target === undefined) ? '' : String(target);
    s = s.trim();

    if (s.length >= 5 && s.slice(0, 5).toLowerCase() === 'line:') {
        return { transferType: 'internal', classification: 'local', normalized: s };
    }

    var cleaned = s.replace(/[\s\-\.\(\)]/g, '');

    if (/^\d{1,6}$/.test(cleaned)) {
        return { transferType: 'internal', classification: 'local', normalized: cleaned };
    }
    var isMobileBE =
        /^04[5-9]\d{8}$/.test(cleaned) ||     // e.g., 0478123456 (10 digits total)
        /^\+324[5-9]\d{7}$/.test(cleaned) ||  // e.g., +32478123456
        /^00324[5-9]\d{7}$/.test(cleaned);    // e.g., 0032478123456

    if (isMobileBE) {
        return { transferType: 'external', classification: 'mobile', normalized: cleaned };
    }
    var isBelgiumLandline =
        ((/^0\d{8,9}$/.test(cleaned) && !/^04[5-9]\d{8}$/.test(cleaned)) ||
            (/^\+32\d+$/.test(cleaned) && !/^\+324[5-9]\d{7}$/.test(cleaned)) ||
            (/^0032\d+$/.test(cleaned) && !/^00324[5-9]\d{7}$/.test(cleaned)));

    if (isBelgiumLandline) {
        return { transferType: 'external', classification: 'national', normalized: cleaned };
    }
    return { transferType: 'external', classification: 'international', normalized: cleaned };
} */
