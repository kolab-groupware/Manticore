'use strict';

angular.module('manticoreApp')
  .controller('MainCtrl', function ($scope, $http, Auth) {
    $scope.documents = [];
    $scope.isLoggedIn = Auth.isLoggedIn;

    $http.get('/api/documents').success(function(documents) {
      $scope.documents = documents;
    });

    $scope.addDocument = function() {
      if($scope.newDocument === '') {
        return;
      }
      $http.post('/api/documents', { name: $scope.newDocument });
      $scope.newDocument = '';
    };

    $scope.deleteDocument = function(document) {
      $http.delete('/api/documents/' + document._id);
    };
  });
