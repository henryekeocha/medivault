import React from 'react';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Avatar,
  Box,
  Skeleton,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface User {
  id: string;
  name: string;
  department: string;
  storageUsed: string;
  filesUploaded: number;
  avatar: string;
}

interface TopUsersTableProps {
  title: string;
  users: User[];
  loading?: boolean;
}

const TopUsersTable: React.FC<TopUsersTableProps> = ({ 
  title, 
  users, 
  loading = false 
}) => {
  const theme = useTheme();

  const renderSkeleton = () => (
    <TableBody>
      {[1, 2, 3, 4, 5].map((item) => (
        <TableRow key={item}>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Skeleton variant="text" width={120} />
            </Box>
          </TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell><Skeleton variant="text" width={60} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>

      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="top users table">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Storage Used</TableCell>
              <TableCell>Files Uploaded</TableCell>
            </TableRow>
          </TableHead>
          
          {loading ? (
            renderSkeleton()
          ) : (
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        alt={user.name} 
                        src={user.avatar} 
                        sx={{ mr: 2, width: 40, height: 40 }} 
                      />
                      <Typography variant="body1">{user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.storageUsed}</TableCell>
                  <TableCell>{user.filesUploaded}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TopUsersTable; 