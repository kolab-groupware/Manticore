'use strict';

angular.module('manticoreApp')
  .controller('TemplatesCtrl', function ($scope, $http, Auth, FileUploader) {
    var uploader = new FileUploader({
        url: '/api/templates/upload',
        headers: {
            'Authorization': 'Bearer ' + Auth.getToken()
        },
        removeAfterUpload: true,
        autoUpload: true,
        onCompleteAll: function () {
            // Wait a little before firing this event, as the upload may not
            // be accessible from MongoDB immediately
            window.setTimeout(function () {
                uploader.clearQueue();
                refresh();
            }, 1000);
        }
    });

    $scope.uploader = uploader;

    $scope.update = function (template) {
        $http.put('/api/templates/' + template._id, template);
    };
    $scope.delete = function(template) {
      $http.delete('/api/templates/' + template._id);
      angular.forEach($scope.templates, function(t, i) {
        if (t === template) {
          $scope.templates.splice(i, 1);
        }
      });
    };

    function refresh() {
        $http.get('/api/templates').success(function (templates) {
            $scope.templates = templates;
        });
    }
    refresh();
  });
