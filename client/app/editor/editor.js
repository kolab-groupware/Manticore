'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('editor', {
        url: '/document/:id',
        resolve: {
            document: function ($stateParams, $http) {
                return $http.get('/api/documents/' + $stateParams.id);
            }
        },
        templateUrl: 'app/editor/editor.html',
        controller: function ($scope, document) {
            $scope.document = document;
        }
      });
  });
