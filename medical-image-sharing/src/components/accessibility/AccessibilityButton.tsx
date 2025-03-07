import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Switch,
  Box,
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  Contrast as ContrastIcon,
  TextFields as TextFieldsIcon,
  Speed as SpeedIcon,
  FormatLineSpacing as LineSpacingIcon,
  TextFormat as TextFormatIcon,
  ScreenSearchDesktop as ScreenReaderIcon,
} from '@mui/icons-material';
import { useAccessibility } from '@/contexts/AccessibilityContext';

const getFontSizeLabel = (size: string) => {
  const scales = {
    'normal': '100%',
    'large': '112.5%',
    'x-large': '125%',
    'xx-large': '137.5%',
    'xxx-large': '150%',
    'xxxx-large': '162.5%',
    'xxxxx-large': '187.5%'
  };
  return scales[size as keyof typeof scales] || '100%';
};

export const AccessibilityButton = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    settings,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    toggleScreenReader,
    toggleReduceMotion,
    toggleLetterSpacing,
    toggleLineHeight,
    isLightMode,
  } = useAccessibility();

  // Apply settings to document body
  useEffect(() => {
    const body = document.body;
    
    // High Contrast
    if (settings.isHighContrast) {
      body.classList.add(isLightMode ? 'high-contrast-light' : 'high-contrast-dark');
    } else {
      body.classList.remove('high-contrast-dark', 'high-contrast-light');
    }

    // Font Size
    body.setAttribute('data-font-size', settings.fontSize);

    // Letter Spacing
    body.setAttribute('data-letter-spacing', settings.letterSpacing);

    // Line Height
    body.setAttribute('data-line-height', settings.lineHeight);

    // Screen Reader Optimization
    if (settings.isScreenReaderOptimized) {
      body.setAttribute('data-screen-reader', 'optimized');
    } else {
      body.removeAttribute('data-screen-reader');
    }

    // Reduce Motion
    if (settings.reduceMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
  }, [settings, isLightMode]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        aria-label="Accessibility Options"
        aria-controls="accessibility-menu"
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl)}
        sx={{
          width: { xs: '36px', sm: '44px' },
          height: { xs: '36px', sm: '44px' },
          color: 'inherit',
        }}
      >
        <AccessibilityIcon />
      </IconButton>

      <Menu
        id="accessibility-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'accessibility-button',
          role: 'menu',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            '& .MuiMenuItem-root': {
              py: 1,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Accessibility Options
          </Typography>
        </Box>
        <Divider />

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <ContrastIcon />
            </ListItemIcon>
            <ListItemText primary="High Contrast" />
          </Box>
          <Switch
            edge="end"
            checked={settings.isHighContrast}
            onChange={toggleHighContrast}
            inputProps={{
              'aria-label': 'Toggle high contrast',
            }}
          />
        </MenuItem>

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <TextFieldsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Font Size" 
              secondary={`Scale: ${getFontSizeLabel(settings.fontSize)}`}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={decreaseFontSize}
              aria-label="Decrease font size"
              disabled={settings.fontSize === 'normal'}
              size="small"
              sx={{ minWidth: '32px', minHeight: '32px' }}
            >
              <TextFieldsIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={increaseFontSize}
              aria-label="Increase font size"
              disabled={settings.fontSize === 'xxxxx-large'}
              size="small"
              sx={{ minWidth: '32px', minHeight: '32px' }}
            >
              <TextFieldsIcon />
            </IconButton>
          </Box>
        </MenuItem>

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <ScreenReaderIcon />
            </ListItemIcon>
            <ListItemText primary="Screen Reader Optimization" />
          </Box>
          <Switch
            edge="end"
            checked={settings.isScreenReaderOptimized}
            onChange={toggleScreenReader}
            inputProps={{
              'aria-label': 'Toggle screen reader optimization',
            }}
          />
        </MenuItem>

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <SpeedIcon />
            </ListItemIcon>
            <ListItemText primary="Reduce Motion" />
          </Box>
          <Switch
            edge="end"
            checked={settings.reduceMotion}
            onChange={toggleReduceMotion}
            inputProps={{
              'aria-label': 'Toggle reduce motion',
            }}
          />
        </MenuItem>

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <TextFormatIcon />
            </ListItemIcon>
            <ListItemText primary="Letter Spacing" />
          </Box>
          <Switch
            edge="end"
            checked={settings.letterSpacing === 'wide'}
            onChange={toggleLetterSpacing}
            inputProps={{
              'aria-label': 'Toggle letter spacing',
            }}
          />
        </MenuItem>

        <MenuItem className="accessibility-menu-item">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              <LineSpacingIcon />
            </ListItemIcon>
            <ListItemText primary="Line Height" />
          </Box>
          <Switch
            edge="end"
            checked={settings.lineHeight === 'wide'}
            onChange={toggleLineHeight}
            inputProps={{
              'aria-label': 'Toggle line height',
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}; 