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

    $scope.export = function (format) {
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
                    });
                })
                .error(function () {
                    $timeout(function () {
                        $scope.label = 'Error while downloading';
                    });
                    $timeout(function () {
                        $scope.label = 'Download';
                        $scope.isExporting = false;
                    }, 1000);
                });
            }
        });
    };
});
