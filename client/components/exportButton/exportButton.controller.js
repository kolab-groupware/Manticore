'use strict';

angular.module('manticoreApp')
.controller('ExportButtonCtrl', function ($scope, SaveAs) {
    $scope.items = [
        {
            label: 'OpenDocument Text (.odt)',
            format: 'odt'
        }
    ];

    $scope.export = function (format) {
        var fileName = $scope.editor.getMetadata('dc:title') || $scope.document.title,
            addExtension = fileName.split('.').pop() !== 'odt';

        if (format === 'odt') {
            $scope.editor.getDocumentAsByteArray(function (err, data) {
                SaveAs.download(
                    [data.buffer],
                    fileName + (addExtension ? '.odt' : ''),
                    { type: 'application/vnd.oasis.opendocument.text' });
            });
        }
    };
});
