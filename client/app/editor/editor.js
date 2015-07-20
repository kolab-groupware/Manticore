'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('editor', {
        abstract: true,
        url: '/document',
        reload: true,
        template: '<ui-view/>'
      })
      .state('editor.forDocument', {
        url: '/:id',
        resolve: {
            socketio: function (angularLoad) {
                return angularLoad.loadScript('socket.io/socket.io.js');
            },
            document: function ($stateParams, $http) {
                return $http.get('/api/documents/' + $stateParams.id)
                .then(function(response) {
                    return response.data;
                });
            }
        },
        templateUrl: 'app/editor/editor.html',
        controller: function ($scope, document) {
            $scope.document = document;
        }
      })
      .state('editor.fromTemplate', {
          url: '/:id/new',
          resolve: {
              document: function ($stateParams, $state, $http) {
                  return $http.get('/api/documents/fromTemplate/' + $stateParams.id)
                  .then(function (response) {
                      $state.go('editor.forDocument', { id: response.data._id }, { location: 'replace' });
                  });
              }
          }
      });
  });
