import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function PromptSelector() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [countries, setCountries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  
  // Selections
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Country', 'Select Category', 'Select Sub-Category'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter sub-categories when category changes
    if (selectedCategory) {
      const filtered = subCategories.filter(sc => sc.category_id === selectedCategory);
      setFilteredSubCategories(filtered);
      setSelectedSubCategory(''); // Reset sub-category selection
    } else {
      setFilteredSubCategories([]);
    }
  }, [selectedCategory, subCategories]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [countriesRes, categoriesRes, subCategoriesRes] = await Promise.all([
        apiFetch('/countries', { method: 'GET' }),
        apiFetch('/categories', { method: 'GET' }),
        apiFetch('/sub-categories', { method: 'GET' })
      ]);

      if (countriesRes.ok && categoriesRes.ok && subCategoriesRes.ok) {
        const [countriesData, categoriesData, subCategoriesData] = await Promise.all([
          countriesRes.json(),
          categoriesRes.json(),
          subCategoriesRes.json()
        ]);

        setCountries(countriesData.countries || []);
        setCategories(categoriesData.categories || []);
        setSubCategories(subCategoriesData.sub_categories || []);
      } else {
        setError('Failed to load configuration data');
      }
    } catch (err) {
      setError('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (countryId) => {
    setSelectedCountry(countryId);
    setActiveStep(1);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setActiveStep(2);
  };

  const handleSubCategorySelect = (subCategoryId) => {
    setSelectedSubCategory(subCategoryId);
  };

  const handleProceed = () => {
    const country = countries.find(c => c.id === selectedCountry);
    const category = categories.find(c => c.id === selectedCategory);
    const subCategory = filteredSubCategories.find(sc => sc.id === selectedSubCategory);

    // Navigate to prompts page with context
    navigate('/prompts', {
      state: {
        countryId: selectedCountry,
        countryName: country?.country_name,
        categoryId: selectedCategory,
        categoryName: category?.category_name,
        subCategoryId: selectedSubCategory,
        subCategoryName: subCategory?.sub_category_name
      }
    });
  };

  const getSelectedCountry = () => countries.find(c => c.id === selectedCountry);
  const getSelectedCategory = () => categories.find(c => c.id === selectedCategory);
  const getSelectedSubCategory = () => filteredSubCategories.find(sc => sc.id === selectedSubCategory);

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box p={3}>
        <Typography variant="h4" mb={3}>
          Select Context for AI Prompt Templates
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Selection Summary */}
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Selection
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {selectedCountry && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Country: ${getSelectedCountry()?.country_name}`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedCategory && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Category: ${getSelectedCategory()?.category_name}`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedSubCategory && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Sub-Category: ${getSelectedSubCategory()?.sub_category_name}`}
                  color="success"
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Step 1: Country Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Step 1: Select Country
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Country</InputLabel>
            <Select
              value={selectedCountry}
              onChange={(e) => handleCountrySelect(e.target.value)}
              label="Country"
            >
              <MenuItem value="">
                <em>Select a country</em>
              </MenuItem>
              {countries
                .filter(c => c.is_active)
                .map((country) => (
                  <MenuItem key={country.id} value={country.id}>
                    {country.country_name} ({country.iso_code_2})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Step 2: Category Selection */}
        {selectedCountry && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step 2: Select Category
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                label="Category"
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {categories
                  .filter(c => c.is_active)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.category_name} ({category.category_code})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Paper>
        )}

        {/* Step 3: Sub-Category Selection */}
        {selectedCategory && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step 3: Select Sub-Category
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Sub-Category</InputLabel>
              <Select
                value={selectedSubCategory}
                onChange={(e) => handleSubCategorySelect(e.target.value)}
                label="Sub-Category"
              >
                <MenuItem value="">
                  <em>Select a sub-category</em>
                </MenuItem>
                {filteredSubCategories
                  .filter(sc => sc.is_active)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((subCategory) => (
                    <MenuItem key={subCategory.id} value={subCategory.id}>
                      {subCategory.sub_category_name}
                      {subCategory.sub_category_code && ` (${subCategory.sub_category_code})`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Paper>
        )}

        {/* Proceed Button */}
        {selectedCountry && selectedCategory && selectedSubCategory && (
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleProceed}
            >
              Proceed to AI Prompt Templates
            </Button>
          </Box>
        )}
      </Box>
    </MainLayout>
  );
}
