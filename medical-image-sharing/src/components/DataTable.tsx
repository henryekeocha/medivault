'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LoadingOverlay } from './LoadingState';

type Order = 'asc' | 'desc';

interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: T[keyof T]) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRefresh?: () => void;
  defaultSortBy?: keyof T;
  defaultOrder?: Order;
  onSort?: (property: keyof T) => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newRowsPerPage: number) => void;
  totalCount?: number;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  onRefresh,
  defaultSortBy,
  defaultOrder = 'asc',
  onSort,
  searchable = false,
  onSearch,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  totalCount,
  emptyMessage = 'No data available',
  rowActions,
  onRowClick,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = React.useState<keyof T | undefined>(defaultSortBy);
  const [order, setOrder] = React.useState<Order>(defaultOrder);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    onSort?.(property);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange?.(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange?.(parseInt(event.target.value, 10));
    onPageChange?.(0);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {(searchable || onRefresh) && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
          )}
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      <TableContainer sx={{ 
        overflowX: 'auto', 
        width: '100%',
        '&::-webkit-scrollbar': {
          height: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
        }
      }}>
        <LoadingOverlay loading={loading}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={String(column.id)}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {onSort ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                {rowActions && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (rowActions ? 1 : 0)}
                    align="center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    hover
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={String(column.id)} align={column.align}>
                          {column.format ? column.format(value) : String(value)}
                        </TableCell>
                      );
                    })}
                    {rowActions && (
                      <TableCell align="right">{rowActions(row)}</TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </LoadingOverlay>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount ?? data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
} 