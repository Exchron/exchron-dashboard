# Exchron Dashboard - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard Modes](#dashboard-modes)
4. [Playground Mode](#playground-mode)
5. [Classroom Mode](#classroom-mode)
6. [Technical Requirements](#technical-requirements)
7. [Troubleshooting](#troubleshooting)
8. [Support](#support)

## Overview

Exchron is a sophisticated machine learning dashboard designed for exoplanet classification and data analysis. The application provides two distinct modes tailored for different use cases:

- **Playground Mode**: For experimenting with pre-built machine learning models
- **Classroom Mode**: For creating and training custom models from your own data

The application features a modern, light-themed interface with tab-based navigation that guides users through structured workflows for data analysis and model development.

## Getting Started

### Installation and Setup

1. **Clone or download the project** to your local machine
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and navigate to `http://localhost:3000`

### First-Time Setup

When you first access the application:
1. You'll be automatically redirected to the Playground Overview page
2. The application will initialize with default settings
3. Your mode preference and selections will be saved locally for future sessions

## Dashboard Modes

### Mode Selection

At the top of the dashboard, you'll find a dropdown menu that allows you to switch between modes:

- **Playground**: Access pre-built models and datasets for quick experimentation
- **Classroom**: Build and train your own custom models from scratch

Your mode selection is automatically saved and will persist across browser sessions.

## Playground Mode

Playground Mode provides a streamlined workflow for experimenting with pre-trained exoplanet classification models. This mode is perfect for:
- Learning about exoplanet detection
- Testing different model architectures
- Analyzing results with various datasets

### Workflow Overview

The Playground workflow consists of 4 sequential tabs:

```
01 Overview → 02 Data Input → 03 Results → 04 Enhance
```

### Tab 1: Overview

**Purpose**: Explore and select from available pre-trained models

**Key Features**:
- Browse different model architectures (CNN, DNN, etc.)
- View model performance metrics and confusion matrices
- Understand model capabilities and limitations
- Select a model for data analysis

**How to Use**:
1. Browse the available models in the model selection grid
2. Click on a model card to view detailed information
3. Review performance metrics, accuracy scores, and visualizations
4. Click "Input Data" to proceed to the next step

### Tab 2: Data Input

**Purpose**: Choose and configure your input data for model predictions

**Key Features**:
- **Four Input Methods**:
  - **Preloaded Data**: Use curated datasets from Kepler, TESS missions
  - **Manual Entry**: Adjust individual parameters using interactive sliders
  - **Data Upload**: Upload your own CSV files for analysis
  - **Batch Processing**: Process multiple files (coming soon)

**Data Input Options**:

#### Preloaded Data
- **Kepler Objects of Interest**: High-confidence transit events (4,892 samples, 2009-2017)
- **TESS Objects of Interest**: Recent candidates from TESS survey (2,674 samples, 2018-2024)
- Select specific record IDs for focused analysis

#### Manual Entry
- Interactive parameter sliders with real-time value updates
- Bidirectional sync between sliders and text inputs
- Parameter ranges and descriptions provided
- Instant validation and feedback

#### Data Upload
- Drag-and-drop CSV file interface
- Automatic validation and preprocessing
- Support for files up to 5MB
- Required format: `Parameter,Value` header structure
- Download template button for proper formatting

**How to Use**:
1. Select your preferred input method using the mode selector
2. Configure your data according to the chosen method:
   - **Preloaded**: Choose dataset and specific records
   - **Manual**: Adjust parameters using sliders or text inputs
   - **Upload**: Drag and drop your CSV file or click to browse
3. Review data preprocessing information
4. Click "Evaluate" when ready to analyze

### Tab 3: Results

**Purpose**: View and analyze model predictions and performance metrics

**Key Features**:
- **Summary Cards**: Key metrics at a glance
  - Confidence scores
  - Classification results
  - Probability distributions
- **Detailed Results Table**: Complete prediction data with all parameters
- **Visualization Exports**: Download results for further analysis
- **Model Performance Insights**: Understand prediction confidence and reasoning

**Understanding Results**:
- **Probability Confirmed**: Likelihood the object is a confirmed exoplanet (0-100%)
- **Probability False Positive**: Likelihood of false detection (0-100%)
- **Classification**: Final binary decision based on threshold
- **Confidence Level**: Overall model certainty in the prediction

**How to Use**:
1. Review the summary metrics in the overview cards
2. Examine detailed results in the expandable table
3. Note confidence levels and probability distributions
4. Use "Classify Another" to return to data input
5. Click "Enhance" to improve model performance

### Tab 4: Enhance

**Purpose**: Improve model performance and contribute to model development

**Key Features**:
- **Model Tuning**: Adjust hyperparameters and thresholds
- **Data Contribution**: Submit datasets for model improvement
- **Feedback System**: Report false positives/negatives
- **Feature Suggestions**: Propose new engineered features

**Enhancement Options**:

#### Model Tuning
- Threshold adjustment for classification decisions
- Confidence level calibration
- Performance optimization suggestions

#### Data Contribution
- Upload validation datasets
- Provide labeled examples
- Submit edge cases and challenging scenarios

**How to Use**:
1. Review current model performance
2. Adjust parameters using the tuning controls
3. Submit feedback on model predictions
4. Upload additional datasets if available
5. Provide context for challenging cases

## Classroom Mode

Classroom Mode provides a comprehensive environment for building and training custom machine learning models. This mode is ideal for:
- Educational purposes and learning ML concepts
- Creating models for specific datasets
- Understanding the full ML pipeline from data to deployment

### Workflow Overview

The Classroom workflow consists of 4 sequential tabs with a visual progress indicator:

```
01 Data Input → 02 Model Selection → 03 Train & Validate → 04 Test & Export
```

### Tab 1: Data Input

**Purpose**: Upload, prepare, and configure your dataset for machine learning

**Key Features**:
- **Multiple Data Sources**:
  - Upload your own CSV files
  - Use built-in TESS or Kepler datasets
  - Manual data entry options
- **Automatic Data Analysis**:
  - Column type inference (numeric, categorical, boolean, datetime)
  - Missing value detection and statistics
  - Data quality assessment
- **Feature Engineering**:
  - Feature selection interface
  - Target variable specification
  - Data preprocessing options

**Data Requirements**:
- CSV format with header row
- Minimum 10 data rows (more recommended)
- Target column should be categorical or low-cardinality numeric (2-10 unique values)
- Features should be numeric or categorical
- Consistent column count across all rows

**How to Use**:
1. **Upload Data**:
   - Drag and drop CSV file or click to browse
   - Review automatic data parsing and validation
   - Check for any data quality issues

2. **Configure Target**:
   - Select the column you want to predict (target variable)
   - Verify the target variable type (binary, multiclass)
   - Review class distribution

3. **Select Features**:
   - Choose which columns to use as input features
   - Exclude irrelevant or identifier columns
   - Review feature statistics and types

4. **Data Preprocessing**:
   - Choose missing value handling strategy
   - Configure normalization options
   - Review preprocessing pipeline

5. Click "Select Model" to proceed to model selection

### Tab 2: Model Selection

**Purpose**: Choose model architecture and configure hyperparameters

**Key Features**:
- **Model Options**:
  - **Neural Network**: Deep learning with customizable architecture
  - **Random Forest**: Ensemble tree-based method
  - **Logistic Regression**: Linear baseline model (planned)
- **Hyperparameter Configuration**:
  - Architecture parameters (layers, nodes, depth)
  - Training parameters (learning rate, epochs, batch size)
  - Regularization options (dropout, L2 regularization)
- **Auto-Suggest**: Automatic parameter recommendations based on dataset

**Neural Network Configuration**:
- **Hidden Layers**: Define layer sizes (e.g., "128,64,32")
- **Learning Rate**: Model training speed (default: 0.001)
- **Epochs**: Training iterations (default: 100)
- **Batch Size**: Samples per training batch (default: 32)
- **Dropout Rate**: Regularization strength (default: 0.3)

**Random Forest Configuration**:
- **Number of Trees**: Ensemble size (default: 100)
- **Max Depth**: Tree depth limit (default: 10)
- **Min Samples Split**: Minimum samples to split nodes (default: 2)
- **Min Samples Leaf**: Minimum samples in leaf nodes (default: 1)
- **Max Features**: Features considered per split (default: sqrt)

**How to Use**:
1. Review available model options
2. Select the model type that best fits your data and problem
3. Configure hyperparameters:
   - Use default values for beginners
   - Adjust based on dataset size and complexity
   - Use Auto-Suggest for recommendations
4. Review complexity estimates and training time predictions
5. Click "Start Training" to begin model development

### Tab 3: Train & Validate

**Purpose**: Train your model and monitor performance in real-time

**Key Features**:
- **Live Training Monitoring**:
  - Real-time metrics updates
  - Training and validation loss curves
  - Accuracy progression tracking
- **Model-Specific Visualizations**:
  - **Neural Network**: Epoch-by-epoch loss/accuracy graphs
  - **Random Forest**: Tree-by-tree progress with feature importance
- **Training Controls**:
  - Start/stop training
  - Early stopping detection
  - Overfitting warnings
- **Performance Metrics**:
  - Accuracy, precision, recall, F1-score
  - Confusion matrix visualization
  - Feature importance analysis

**Training Process**:

#### Neural Network Training
1. **Data Preprocessing**: Automatic feature encoding and normalization
2. **Model Architecture**: Creates network based on your specifications
3. **Training Loop**: Epochs with real-time metric updates
4. **Validation**: Continuous validation on held-out data
5. **Early Stopping**: Automatic detection of optimal stopping point

#### Random Forest Training
1. **Data Preparation**: Feature selection and encoding
2. **Tree Building**: Progressive tree construction with visual feedback
3. **Out-of-Bag Scoring**: Real-time accuracy estimates
4. **Feature Importance**: Automatic calculation of feature contributions
5. **Ensemble Assembly**: Combining trees for final model

**How to Use**:
1. **Review Training Setup**:
   - Verify data configuration
   - Check feature selection
   - Confirm model parameters

2. **Start Training**:
   - Click "Start Training" button
   - Monitor real-time progress
   - Watch for overfitting indicators

3. **Monitor Performance**:
   - Track accuracy and loss metrics
   - Review feature importance (Random Forest)
   - Check for early stopping suggestions

4. **Training Completion**:
   - Review final metrics
   - Examine confusion matrix
   - Note model performance summary

5. Click "Go to Test & Export" when training completes

### Tab 4: Test & Export

**Purpose**: Evaluate final model performance and export trained models

**Key Features**:
- **Model Testing**:
  - Performance evaluation on test data
  - ROC curve and AUC analysis
  - Precision-Recall curves
  - Detailed confusion matrix
- **Interactive Predictions**:
  - Manual input form for single predictions
  - Real-time probability updates
  - Threshold adjustment slider
- **Model Export**:
  - Download trained model files
  - Export configuration and metadata
  - Generate inference code snippets
- **Performance Analysis**:
  - Comprehensive metrics dashboard
  - Model comparison tools
  - Performance visualization

**Testing Workflow**:
1. **Automatic Testing**: Model automatically evaluated on test dataset
2. **Metrics Calculation**: ROC/AUC, Precision/Recall computed
3. **Threshold Optimization**: Find optimal classification threshold
4. **Performance Review**: Detailed analysis of model capabilities

**Export Options**:
- **Model Files**: Trained model in appropriate format (TensorFlow.js, JSON)
- **Metadata**: Training configuration, feature names, preprocessing steps
- **Performance Report**: Complete evaluation metrics and visualizations
- **Inference Code**: Ready-to-use prediction functions

**How to Use**:
1. **Review Test Results**:
   - Examine test accuracy and metrics
   - Analyze ROC and PR curves
   - Check confusion matrix

2. **Interactive Testing**:
   - Use manual input form for custom predictions
   - Adjust decision threshold as needed
   - Test edge cases and boundary conditions

3. **Export Model**:
   - Download model files for deployment
   - Save training configuration
   - Export performance reports

4. **Next Steps**:
   - Train another model with different parameters
   - Return to data input for new datasets
   - Deploy model for production use

## Technical Requirements

### System Requirements
- **Browser**: Modern web browser (Chrome, Firefox, Safari, Edge)
- **JavaScript**: Enabled
- **Memory**: 4GB+ RAM recommended for large datasets
- **Storage**: Local storage enabled for session persistence

### Data Requirements
- **File Format**: CSV with header row
- **File Size**: Up to 10MB for uploads
- **Data Quality**: Consistent column structure, minimal missing values
- **Features**: Numeric or categorical data preferred

### Performance Considerations
- **Dataset Size**: Optimal performance with <100,000 rows, <300 columns
- **Training Time**: Varies by model complexity and data size
- **Browser Limitations**: All computation runs client-side (no server required)

## Troubleshooting

### Common Issues

#### Data Upload Problems
**Problem**: CSV file not uploading or parsing errors
**Solutions**:
- Ensure file is valid CSV format with header row
- Check for consistent column count across all rows
- Verify file size is under 10MB limit
- Remove special characters from column names

#### Model Training Issues
**Problem**: Training fails or produces poor results
**Solutions**:
- Verify target column has appropriate class distribution
- Ensure sufficient training data (minimum 10 rows per class)
- Check for missing values in critical columns
- Reduce model complexity for small datasets

#### Performance Issues
**Problem**: Slow training or browser freezing
**Solutions**:
- Reduce dataset size or sample data
- Lower model complexity (fewer layers, trees)
- Close other browser tabs to free memory
- Use smaller batch sizes for neural networks

#### Results Interpretation
**Problem**: Unclear model predictions or metrics
**Solutions**:
- Review model confidence scores
- Check confusion matrix for class-wise performance
- Examine feature importance for insights
- Adjust decision threshold for different precision/recall trade-offs

### Error Messages

#### "Invalid CSV format"
- Check that your file has a proper header row
- Ensure all rows have the same number of columns
- Verify file encoding is UTF-8

#### "Insufficient training data"
- Add more rows to your dataset
- Ensure target column has multiple classes represented
- Check for and handle missing values

#### "Model training failed"
- Reduce model complexity
- Check for data quality issues
- Verify feature selection is appropriate

### Browser Storage
The application uses browser local storage to save:
- Mode preferences
- Model selections
- Training progress
- Dataset configurations

To reset: Clear browser data for the application domain.

## Support

### Documentation
- **Full Documentation**: [docs.exchronai.earth](https://docs.exchronai.earth)
- **Learning Platform**: [learn.exchronai.earth](https://learn.exchronai.earth)
- **API Reference**: Available in the documentation portal

### Contact Information
- **Email**: info.exchron@gmail.com
- **Support**: General questions and technical issues
- **Feedback**: Model improvement suggestions and bug reports

### Community Resources
- **Educational Content**: Comprehensive guides on exoplanet detection
- **Model Examples**: Sample datasets and use cases
- **Best Practices**: Tips for optimal model performance

### Contributing
Users can contribute to model improvement by:
- Submitting labeled datasets
- Reporting false positives/negatives
- Suggesting feature engineering improvements
- Providing domain expertise feedback

---

**Version**: 1.0  
**Last Updated**: January 2025  
**Copyright**: Exchron 2025 - All Rights Reserved

For the most up-to-date information and detailed technical documentation, visit [docs.exchronai.earth](https://docs.exchronai.earth).