/*
 * Copyright (C) 2013 Glyptodon LLC
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

package org.glyptodon.guacamole.auth.jdbc.user;


import org.glyptodon.guacamole.auth.jdbc.connectiongroup.RootConnectionGroup;
import org.glyptodon.guacamole.auth.jdbc.connectiongroup.ConnectionGroupDirectory;
import org.glyptodon.guacamole.auth.jdbc.connection.ConnectionDirectory;
import com.google.inject.Inject;
import com.google.inject.Provider;
import java.util.ArrayList;
import java.util.Collection;
import org.glyptodon.guacamole.GuacamoleException;
import org.glyptodon.guacamole.auth.jdbc.base.RestrictedObject;
import org.glyptodon.guacamole.auth.jdbc.tunnel.GuacamoleTunnelService;
import org.glyptodon.guacamole.net.auth.Connection;
import org.glyptodon.guacamole.net.auth.ConnectionGroup;
import org.glyptodon.guacamole.net.auth.ConnectionRecord;
import org.glyptodon.guacamole.net.auth.Directory;
import org.glyptodon.guacamole.net.auth.User;

/**
 * UserContext implementation which is driven by an arbitrary, underlying
 * database.
 *
 * @author James Muehlner
 * @author Michael Jumper
 */
public class UserContext extends RestrictedObject
    implements org.glyptodon.guacamole.net.auth.UserContext {

    /**
     * Service for creating and tracking tunnels.
     */
    @Inject
    private GuacamoleTunnelService tunnelService;

    /**
     * User directory restricted by the permissions of the user associated
     * with this context.
     */
    @Inject
    private UserDirectory userDirectory;
 
    /**
     * Connection directory restricted by the permissions of the user
     * associated with this context.
     */
    @Inject
    private ConnectionDirectory connectionDirectory;

    /**
     * Connection group directory restricted by the permissions of the user
     * associated with this context.
     */
    @Inject
    private ConnectionGroupDirectory connectionGroupDirectory;

    /**
     * Provider for creating the root group.
     */
    @Inject
    private Provider<RootConnectionGroup> rootGroupProvider;

    @Override
    public void init(AuthenticatedUser currentUser) {

        super.init(currentUser);
        
        // Init directories
        userDirectory.init(currentUser);
        connectionDirectory.init(currentUser);
        connectionGroupDirectory.init(currentUser);

    }

    @Override
    public User self() {
        return getCurrentUser().getUser();
    }

    @Override
    public Directory<User> getUserDirectory() throws GuacamoleException {
        return userDirectory;
    }

    @Override
    public Directory<Connection> getConnectionDirectory() throws GuacamoleException {
        return connectionDirectory;
    }

    @Override
    public Directory<ConnectionGroup> getConnectionGroupDirectory() throws GuacamoleException {
        return connectionGroupDirectory;
    }

    @Override
    public ConnectionGroup getRootConnectionGroup() throws GuacamoleException {

        // Build and return a root group for the current user
        RootConnectionGroup rootGroup = rootGroupProvider.get();
        rootGroup.init(getCurrentUser());
        return rootGroup;

    }

    @Override
    public Collection<ConnectionRecord> getActiveConnections()
            throws GuacamoleException {
        return tunnelService.getActiveConnections(getCurrentUser());
    }

    @Override
    public Collection<ConnectionRecord> getActiveConnections(Collection<String> tunnelUUIDs)
            throws GuacamoleException {

        // Look up active connections for each given tunnel UUID
        Collection<ConnectionRecord> records = new ArrayList<ConnectionRecord>(tunnelUUIDs.size());
        for (String tunnelUUID : tunnelUUIDs) {

            // Add corresponding record only if it exists
            ConnectionRecord record = tunnelService.getActiveConnection(getCurrentUser(), tunnelUUID);
            if (record != null)
                records.add(record);

        }

        return records;
        
    }

}
