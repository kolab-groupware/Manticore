'use strict';

angular.module('manticoreApp')
  .controller('MainCtrl', function ($scope, $http, Auth) {
    $scope.documents = [];
    $scope.isLoggedIn = Auth.isLoggedIn;

    $http.get('/api/documents').success(function(documents) {
      $scope.documents = documents;
    });

    $scope.openDocument = function (document) {
      $http.get('/api/documents/snapshot/' + _.last(document.chunks))
      .success(function (data) {
          
      }).error(function (data) {
          console.log(data);
      })
    };

    $scope.deleteDocument = function(document) {
      $http.delete('/api/documents/' + document._id);
    };
  });
