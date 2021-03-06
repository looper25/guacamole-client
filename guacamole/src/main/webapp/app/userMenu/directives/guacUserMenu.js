/*
 * Copyright (C) 2015 Glyptodon LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * A directive which provides a user-oriented menu containing options for
 * navigation and configuration.
 */
angular.module('userMenu').directive('guacUserMenu', [function guacUserMenu() {

    return {
        restrict: 'E',
        replace: true,
        scope: {

            /**
             * The permissions associated with the user for whom this menu is
             * being displayed.
             *
             * @type PermissionSet
             */
            permissions : '='

        },

        templateUrl: 'app/userMenu/templates/guacUserMenu.html',
        controller: ['$scope', '$injector', '$element', function guacUserMenuController($scope, $injector, $element) {

            // Get required types
            var ConnectionGroup = $injector.get("ConnectionGroup");
            var PermissionSet   = $injector.get("PermissionSet");
            
            // Get required services
            var $document             = $injector.get("$document");
            var $location             = $injector.get("$location");
            var authenticationService = $injector.get("authenticationService");
            var guacNotification      = $injector.get('guacNotification');
            var userService           = $injector.get("userService");

            /**
             * An action to be provided along with the object sent to
             * showStatus which closes the currently-shown status dialog.
             */
            var ACKNOWLEDGE_ACTION = {
                name        : "USER_MENU.ACTION_ACKNOWLEDGE",
                // Handle action
                callback    : function acknowledgeCallback() {
                    guacNotification.showStatus(false);
                }
            };

            /**
             * The outermost element of the user menu directive.
             *
             * @type Element
             */
            var element = $element[0];

            /**
             * The main document object.
             *
             * @type Document
             */
            var document = $document[0];

            /**
             * Whether the option to go to the home screen is disabled.
             *
             * @type Boolean
             */
            $scope.homeDisabled = ($location.path() === '/');

            /**
             * Whether the option to go to the user management interface is
             * disabled. Note that shis is different from canManageUsers,
             * which deals with whether permission to manage is granted. A user
             * may have permission, yet see this option as currently disabled.
             *
             * @type Boolean
             */
            $scope.manageUsersDisabled = 
                    ($location.path() === '/manage/modules/users/');

            /**
             * Whether the option to go to the connection management interface
             * is disabled. Note that shis is different from
             * canManageConnections, which deals with whether permission to
             * manage is granted. A user may have permission, yet see this
             * option as currently disabled.
             *
             * @type Boolean
             */
            $scope.manageConnectionsDisabled = 
                    ($location.path() === '/manage/modules/connections/');

            /**
             * Whether the option to go to the session management interface is
             * disabled. Note that shis is different from canManageSessions,
             * which deals with whether permission to manage is granted. A user
             * may have permission, yet see this option as currently disabled.
             *
             * @type Boolean
             */
            $scope.manageSessionsDisabled = 
                    ($location.path() === '/manage/modules/sessions/');

            /**
             * Whether the current user has sufficient permissions to use the
             * user management interface. If permissions have not yet been 
             * loaded, this will be null.
             *
             * @type Boolean
             */
            $scope.canManageUsers = null;

            /**
             * Whether the current user has sufficient permissions to use the
             * connection management interface. If permissions have not yet been 
             * loaded, this will be null.
             *
             * @type Boolean
             */
            $scope.canManageConnections = null;

            /**
             * Whether the current user has sufficient permissions to use the
             * session management interface. If permissions have not yet been 
             * loaded, this will be null.
             *
             * @type Boolean
             */
            $scope.canManageSessions = null;

            /**
             * Whether the current user has sufficient permissions to change
             * his/her own password. If permissions have not yet been loaded,
             * this will be null.
             *
             * @type Boolean
             */
            $scope.canChangePassword = null;

            /**
             * Whether the password edit dialog should be shown.
             *
             * @type Boolean
             */
            $scope.showPasswordDialog = false;

            /**
             * The new password for the user.
             *
             * @type String
             */
            $scope.newPassword = null;

            /**
             * The password match for the user. The update password action will
             * fail if $scope.newPassword !== $scope.passwordMatch.
             *
             * @type String
             */
            $scope.newPasswordMatch = null;

            /**
             * Whether the contents of the user menu are currently shown.
             *
             * @type Boolean
             */
            $scope.menuShown = false;

            /**
             * The username of the current user.
             *
             * @type String
             */
            $scope.username = authenticationService.getCurrentUserID();

            // Update available menu options when permissions are changed
            $scope.$watch('permissions', function permissionsChanged(permissions) {

                // Permissions are unknown if no permissions are provided
                if (!permissions) {
                    $scope.canChangePassword = null;
                    $scope.canManageGuacamole = null;
                    return;
                }

                // Determine whether the current user can change his/her own password
                $scope.canChangePassword = 
                        PermissionSet.hasUserPermission(permissions, PermissionSet.ObjectPermissionType.UPDATE, $scope.username)
                     && PermissionSet.hasUserPermission(permissions, PermissionSet.ObjectPermissionType.READ,   $scope.username);

                // Ignore permission to update root group
                PermissionSet.removeConnectionGroupPermission(permissions, PermissionSet.ObjectPermissionType.UPDATE, ConnectionGroup.ROOT_IDENTIFIER);
                
                // Ignore permission to update self
                PermissionSet.removeUserPermission(permissions, PermissionSet.ObjectPermissionType.UPDATE, $scope.username);

                // Determine whether the current user needs access to the user management UI
                $scope.canManageUsers =

                        // System permissions
                           PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.ADMINISTER)
                        || PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.CREATE_USER)

                        // Permission to update users
                        || PermissionSet.hasUserPermission(permissions,            PermissionSet.ObjectPermissionType.UPDATE)

                        // Permission to delete users
                        || PermissionSet.hasUserPermission(permissions,            PermissionSet.ObjectPermissionType.DELETE)

                        // Permission to administer users
                        || PermissionSet.hasUserPermission(permissions,            PermissionSet.ObjectPermissionType.ADMINISTER);

                // Determine whether the current user needs access to the connection management UI
                $scope.canManageConnections =

                        // System permissions
                           PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.ADMINISTER)
                        || PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.CREATE_CONNECTION)
                        || PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.CREATE_CONNECTION_GROUP)

                        // Permission to update connections or connection groups
                        || PermissionSet.hasConnectionPermission(permissions,      PermissionSet.ObjectPermissionType.UPDATE)
                        || PermissionSet.hasConnectionGroupPermission(permissions, PermissionSet.ObjectPermissionType.UPDATE)

                        // Permission to delete connections or connection groups
                        || PermissionSet.hasConnectionPermission(permissions,      PermissionSet.ObjectPermissionType.DELETE)
                        || PermissionSet.hasConnectionGroupPermission(permissions, PermissionSet.ObjectPermissionType.DELETE)

                        // Permission to administer connections or connection groups
                        || PermissionSet.hasConnectionPermission(permissions,      PermissionSet.ObjectPermissionType.ADMINISTER)
                        || PermissionSet.hasConnectionGroupPermission(permissions, PermissionSet.ObjectPermissionType.ADMINISTER);
                
                $scope.canManageSessions = 
                        
                        // A user must be a system administrator to manage sessions
                        PermissionSet.hasSystemPermission(permissions, PermissionSet.SystemPermissionType.ADMINISTER);
                
            });

            /**
             * Toggles visibility of the user menu.
             */
            $scope.toggleMenu = function toggleMenu() {
                $scope.menuShown = !$scope.menuShown;
            };

            /**
             * Show the password update dialog.
             */
            $scope.showPasswordUpdate = function showPasswordUpdate() {
                
                // Show the dialog
                $scope.showPasswordDialog = true;
            };
            
            /**
             * Close the password update dialog.
             */
            $scope.closePasswordUpdate = function closePasswordUpdate() {
                
                // Clear the password fields and close the dialog
                $scope.oldPassword        = null;
                $scope.newPassword        = null;
                $scope.newPasswordMatch   = null;
                $scope.showPasswordDialog = false;
            };
            
            /**
             * Update the current user's password to the password currently set within
             * the password change dialog.
             */
            $scope.updatePassword = function updatePassword() {

                // Verify passwords match
                if ($scope.newPasswordMatch !== $scope.newPassword) {
                    guacNotification.showStatus({
                        className  : 'error',
                        title      : 'USER_MENU.DIALOG_HEADER_ERROR',
                        text       : 'USER_MENU.ERROR_PASSWORD_MISMATCH',
                        actions    : [ ACKNOWLEDGE_ACTION ]
                    });
                    return;
                }
                
                // Verify that the new password is not blank
                if (!$scope.newPassword) {
                    guacNotification.showStatus({
                        className  : 'error',
                        title      : 'USER_MENU.DIALOG_HEADER_ERROR',
                        text       : 'USER_MENU.ERROR_PASSWORD_BLANK',
                        actions    : [ ACKNOWLEDGE_ACTION ]
                    });
                    return;
                }
                
                // Save the user with the new password
                userService.updateUserPassword($scope.username, $scope.oldPassword, $scope.newPassword)
                .success(function passwordUpdated() {
                
                    // Close the password update dialog
                    $scope.closePasswordUpdate();

                    // Indicate that the password has been changed
                    guacNotification.showStatus({
                        text    : 'USER_MENU.PASSWORD_CHANGED',
                        actions : [ ACKNOWLEDGE_ACTION ]
                    });
                })
                
                // Notify of any errors
                .error(function passwordUpdateFailed(error) {
                    guacNotification.showStatus({
                        className  : 'error',
                        title      : 'USER_MENU.DIALOG_HEADER_ERROR',
                        'text'       : error.message,
                        actions    : [ ACKNOWLEDGE_ACTION ]
                    });
                });
                
            };

            /**
             * Navigates to the home screen.
             */
            $scope.navigateHome = function navigateHome() {
                $location.path('/');
            };

            /**
             * Navigates to the user management interface.
             */
            $scope.manageUsers = function manageUsers() {
                $location.path('/manage/modules/users/');
            };

            /**
             * Navigates to the connection management interface.
             */
            $scope.manageConnections = function manageConnections() {
                $location.path('/manage/modules/connections/');
            };

            /**
             * Navigates to the user session management interface.
             */
            $scope.manageSessions = function manageSessions() {
                $location.path('/manage/modules/sessions/');
            };

            /**
             * Logs out the current user, redirecting them to back to the login
             * screen after logout completes.
             */
            $scope.logout = function logout() {
                authenticationService.logout()['finally'](function logoutComplete() {
                    $location.path('/login/');
                });
            };

            // Close menu when use clicks anywhere else
            document.body.addEventListener("click", function clickOutsideMenu() {
                $scope.$apply(function closeMenu() {
                    $scope.menuShown = false;
                });
            }, false);

            // Prevent click within menu from triggering the outside-menu handler
            element.addEventListener("click", function clickInsideMenu(e) {
                e.stopPropagation();
            }, false);

        }] // end controller

    };
}]);
