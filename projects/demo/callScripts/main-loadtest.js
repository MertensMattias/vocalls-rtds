Logger.info('=================================================');
Logger.info('Load test — main.js execution only (no agent config)');
Logger.info('=================================================');

logInfo('main-loadtest.js loaded successfully');
logInfo(
    'Language: ' + (typeof language !== 'undefined' ? language : '(unset)')
);
logInfo(
    'Segment: ' +
        (typeof segmentState !== 'undefined' && segmentState
            ? segmentState.currentSegment
            : '(unset)')
);
logInfo('Project: demo');
