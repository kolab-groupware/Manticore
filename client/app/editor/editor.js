'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('manticore.editor', {
        abstract: true,
        url: '/document',
        reload: true,
        template: '<ui-view/>'
      })
      .state('manticore.editor.forDocument', {
        url: '/:id/:authToken',
        resolve: {
            user: function ($stateParams, $state, Auth) {
              if ($stateParams.authToken === 'new') {
                $state.go('manticore.editor.fromTemplate', { id: $stateParams.id });
              } else if ($stateParams.authToken) {
                return Auth.login($stateParams.authToken);
              }
            },
            socketio: function (angularLoad) {
                return angularLoad.loadScript('socket.io/socket.io.js');
            },
            document: function ($stateParams, user, $http) {
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
      .state('manticore.editor.fromTemplate', {
          url: '/:id/new',
          resolve: {
              document: function ($stateParams, $state, $http) {
                  return $http.get('/api/documents/fromTemplate/' + $stateParams.id)
                  .then(function (response) {
                      $state.go('manticore.editor.forDocument', { id: response.data._id }, { location: 'replace' });
                  });
              }
          }
      });
  });
