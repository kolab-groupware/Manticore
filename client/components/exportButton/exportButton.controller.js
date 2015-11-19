'use strict';

angular.module('manticoreApp')
.controller('ExportButtonCtrl', function ($scope, $http, $timeout, SaveAs) {
    $scope.label = 'Download';
    $scope.isExporting = false;
    $scope.conversionHost = $scope.$root.config.conversionHost;

    $scope.items = [
        { format: 'odt',    label: 'OpenDocument Text (.odt)'           },
    ];
    if ($scope.conversionHost) {
        $scope.items = $scope.items.concat([
            { format: 'pdf',    label: 'Portable Document Format (.pdf)'    },
            { format: 'txt',    label: 'Plain Text (.txt)'                  },
            { format: 'docx',   label: 'Microsoft Word (.docx)'             },
            { format: 'doc',    label: 'Microsoft Word, old (.doc)'         },
            { format: 'html',   label: 'HTML (.html)'                       },
        ]);
    }

    /**
     * @param {!string} format
     * @param {Function=} cb Optional callback that provides success value (true/false)
     */
    $scope.export = function (format, cb) {
        $scope.label = 'Downloading...';
        $scope.isExporting = true;

        var title = $scope.editor.getMetadata('dc:title') || $scope.document.title,
            fileName = title.replace(/\.[^.$]+$/, '');

        $scope.editor.getDocumentAsByteArray(function (err, data) {
            if (format === 'odt') {
                SaveAs.download(
                    [data.buffer],
                    fileName + '.odt',
                    { type: 'application/vnd.oasis.opendocument.text' }
                );
                $scope.label = 'Download';
                $scope.isExporting = false;
                if (cb) { cb(true); }
            } else {
                var formData = new FormData();
                formData.append('document', new Blob([data.buffer], { type: 'application/vnd.oasis.opendocument.text' }));
                $http({
                    method: 'POST',
                    url: $scope.conversionHost + '/convert/' + format,
                    data: formData,
                    responseType: 'arraybuffer',
                    transformRequest: angular.identity,
                    transformResponse: angular.identity,
                    headers: { 'Content-Type': undefined }
                })
                .success(function (data, status, headers) {
                    SaveAs.download(
                        [data],
                        fileName + '.' + format,
                        { type: headers('content-type') }
                    );
                    $timeout(function () {
                        $scope.label = 'Download';
                        $scope.isExporting = false;
                        if (cb) { cb(true); }
                    });
                })
                .error(function () {
                    $timeout(function () {
                        $scope.label = 'Error while downloading';
                        if (cb) { cb(false); }
                    });
                    $timeout(function () {
                        $scope.label = 'Download';
                        $scope.isExporting = false;
                    }, 1000);
                });
            }
        });
    };

    function iframeGetExportFormats(event) {
      event.source.postMessage({
        id: event.data.id,
        value: angular.copy($scope.items)
      }, event.origin);
    }

    function iframeActionExport(event) {
      $scope.export(event.data.value, function (successful) {
        event.source.postMessage({
          id: event.data.id,
          successful: successful
        }, event.origin);
      });
    }

    $scope.$watch('joined', function (online) {
        if (online === undefined) { return; }
        if (online) {
            $scope.editor.addIframeEventListener('getExportFormats', iframeGetExportFormats);
            $scope.editor.addIframeEventListener('actionExport', iframeActionExport);
        } else {
            $scope.editor.removeIframeEventListener('getExportFormats', iframeGetExportFormats);
            $scope.editor.removeIframeEventListener('actionExport', iframeActionExport);
        }
    });
});
