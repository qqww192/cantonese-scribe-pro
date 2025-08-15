# CantoneseScribe Usage Tracking System Implementation

## Overview

This document outlines the comprehensive usage tracking system implemented for CantoneseScribe MVP. The system provides robust usage monitoring, limit enforcement, and analytics capabilities designed to scale with the application's growth.

## 🚀 System Architecture

### Core Components

1. **Usage Service** (`usage_service.py`) - Central service for tracking and managing usage
2. **Monthly Reset Service** (`monthly_reset_service.py`) - Automated monthly usage resets
3. **Usage Analytics Service** (`usage_analytics_service.py`) - Comprehensive analytics and reporting
4. **Usage Tracking Middleware** (`usage_tracking.py`) - Automatic usage recording
5. **Usage API Endpoints** (`/api/v1/usage/`) - Frontend integration points

### Database Schema

- **Enhanced `usage_tracking` table** - Core usage data
- **`user_plan_limits` table** - Flexible plan configuration
- **`concurrent_processing` table** - Real-time job tracking  
- **`usage_quotas` table** - Custom quota management
- **`usage_alerts` table** - User notifications
- **`usage_analytics` table** - Analytics storage

## 📊 Features Implemented

### 1. Usage Tracking & Recording

- **Atomic Usage Recording**: Prevents double-charging with transaction safety
- **Comprehensive Metrics**: Duration, file size, cost, tokens, and metadata
- **Usage Types**: Transcription, export, API calls with extensible type system
- **Audit Trail**: Complete tracking for compliance and debugging

```python
# Example usage recording
await usage_service.record_usage(
    user_id=user_id,
    usage_type="transcription",
    duration_seconds=300,
    file_size_bytes=10*1024*1024,
    cost=Decimal("0.03"),
    transcription_id=transcription_id
)
```

### 2. Plan-Based Limits

#### Free Tier (MVP Spec)
- **30 credits/month** (1 credit = 1 minute of audio)
- **25MB file size limit**
- **1 concurrent processing job**
- **Basic features**: SRT/VTT export, Cantonese support

#### Upgrade Paths
- **Starter**: 150 credits, 100MB, 2 concurrent jobs
- **Pro**: 500 credits, 500MB, 5 concurrent jobs  
- **Enterprise**: 2000 credits, 1GB, 10 concurrent jobs

### 3. Real-Time Limit Enforcement

```python
# Pre-processing validation
usage_check = await usage_service.check_usage_limits(
    user_id=user_id,
    estimated_duration_seconds=180,
    file_size_bytes=15*1024*1024
)

if not usage_check.can_process:
    # Block request with detailed error response
    return HTTPException(429, detail=usage_check.blocking_reason)
```

### 4. Monthly Reset Automation

- **Timezone-aware resets** based on user account creation date
- **Daily automated checks** at 2 AM UTC
- **Batch processing** for performance
- **Error handling and retry logic**
- **Audit logging** for all resets

### 5. Concurrent Processing Management

- **Real-time job tracking** with status monitoring
- **Queue management** when limits exceeded
- **Automatic cleanup** of completed jobs
- **Performance monitoring** and stuck job detection

### 6. Usage Analytics & Monitoring

#### User Analytics
- Current usage and remaining credits
- Historical usage patterns
- Usage forecasting and trends
- Activity patterns and engagement metrics

#### Admin Analytics  
- System-wide usage statistics
- Plan utilization analysis
- Cost optimization insights
- User behavior analytics
- Real-time monitoring dashboard

### 7. API Integration

#### Frontend Integration Endpoints
- `GET /api/v1/usage/current` - Current usage status
- `POST /api/v1/usage/check` - Pre-flight limit checks
- `GET /api/v1/usage/alerts` - Usage notifications
- `GET /api/v1/usage/limits` - Plan information

#### Transcription Integration
- `POST /api/v1/transcription/check-limits` - Pre-upload validation
- Automatic usage recording in transcription workflow
- Enhanced error responses with upgrade prompts

## 🔧 Technical Implementation

### Middleware Integration

The usage tracking middleware automatically:
- Records usage for tracked endpoints
- Enforces limits before processing
- Manages concurrent job tracking
- Provides detailed error responses

```python
# Middleware configuration in main.py
app.add_middleware(
    UsageTrackingMiddleware,
    enable_enforcement=settings.environment != "development"
)
```

### Database Functions

```sql
-- Get user's current plan limits
SELECT * FROM get_user_plan_limits(user_uuid);

-- Check concurrent processing availability  
SELECT * FROM check_concurrent_processing_limit(user_uuid);

-- Calculate comprehensive usage statistics
SELECT * FROM calculate_usage_stats(user_uuid, months_back);
```

### Error Handling

Comprehensive error handling with:
- **Graceful degradation** when usage service is unavailable
- **Detailed error messages** with actionable upgrade paths
- **Retry mechanisms** for transient failures
- **Audit logging** for debugging and compliance

## 📈 Performance & Scalability

### Optimizations Implemented

1. **Database Indexing**
   - Optimized queries for user usage lookups
   - Efficient monthly aggregation queries
   - Performance indexes on high-traffic columns

2. **Caching Strategy**
   - Plan limits cached in application memory
   - Usage statistics cached with TTL
   - Concurrent job counts in Redis (future enhancement)

3. **Batch Processing**
   - Monthly resets processed in configurable batches
   - Analytics calculations run asynchronously
   - Background cleanup of old data

4. **Query Optimization**
   - Single-query usage calculations
   - Efficient join patterns for analytics
   - Pagination for large result sets

## 🛠️ Configuration & Deployment

### Environment Configuration

```python
# Usage tracking settings in config.py
max_concurrent_jobs: int = 5
rate_limit_requests: int = 100
rate_limit_window: int = 3600
max_daily_cost: float = 50.0
whisper_cost_per_minute: float = 0.006
```

### Monitoring & Alerts

- **System health checks** every 4 hours
- **Automated daily reset monitoring**
- **Cost threshold alerts**
- **Performance metrics collection**
- **Error rate monitoring**

## 🧪 Testing

Comprehensive test suite (`test_usage_system.py`) covering:

1. **Usage Service Core Functions**
   - Usage recording and retrieval
   - Current usage calculations
   - Historical data queries

2. **Limit Enforcement**
   - Credit limit validation
   - File size restrictions
   - Concurrent job limits

3. **Monthly Reset System**
   - Manual and automated resets
   - Timezone handling
   - Data consistency

4. **Analytics & Reporting**
   - Real-time metrics
   - Cost analysis
   - User behavior insights

5. **API Integration**
   - Endpoint response validation
   - Error handling
   - Authentication integration

6. **Database Integrity**
   - Schema validation
   - Function testing
   - Performance verification

### Running Tests

```bash
# Run comprehensive usage system tests
python test_usage_system.py

# Check database schema integrity
python -c "from test_usage_system import UsageSystemTester; import asyncio; asyncio.run(UsageSystemTester().test_database_schema())"
```

## 🚀 Deployment Checklist

### Database Migrations
- [ ] Run `001_initial_schema.sql`
- [ ] Run `002_usage_tracking_enhancements.sql`
- [ ] Verify all tables and functions created
- [ ] Test database functions work correctly

### Application Deployment
- [ ] Usage tracking middleware enabled
- [ ] Monthly reset scheduler started
- [ ] All usage endpoints responding
- [ ] Error handling working correctly

### Configuration
- [ ] Plan limits configured correctly
- [ ] Cost tracking parameters set
- [ ] Monitoring and alerting enabled
- [ ] Analytics collection working

### Frontend Integration
- [ ] Usage widgets displaying correct data
- [ ] Limit enforcement working in UI
- [ ] Upgrade prompts functioning
- [ ] Real-time updates working

## 📊 Usage Analytics Dashboard

The system provides comprehensive analytics through:

### Real-Time Metrics
- Active processing jobs
- Current system load
- Daily usage statistics
- Error rates and performance

### Business Intelligence
- Plan utilization rates
- User engagement patterns
- Revenue optimization insights
- Cost analysis and forecasting

### User Experience
- Usage warnings and notifications
- Personalized upgrade recommendations
- Usage history and patterns
- Billing period tracking

## 🔮 Future Enhancements

### Planned Improvements
1. **Advanced Analytics**
   - Machine learning-based usage prediction
   - Personalized recommendation engine
   - Churn prediction and prevention

2. **Enhanced Billing**
   - Usage-based billing integration
   - Overage handling and billing
   - Custom plan creation tools

3. **Performance Optimization**
   - Redis caching layer
   - CDN integration for static assets
   - Database read replicas

4. **Advanced Features**
   - API rate limiting per user
   - Custom usage quotas
   - Team/organization usage tracking

## 🎯 MVP Compliance

This implementation fully satisfies the MVP requirements:

✅ **30 credits/month per free user**  
✅ **1 credit = 1 minute of audio/video**  
✅ **25MB file size limit enforcement**  
✅ **1 concurrent processing job limit**  
✅ **Monthly reset on account anniversary**  
✅ **Real-time usage tracking and display**  
✅ **Pre-processing limit validation**  
✅ **Comprehensive error handling**  
✅ **Upgrade path integration**  
✅ **Admin monitoring capabilities**

## 🛡️ Security & Privacy

- **Row-level security** on all usage tables
- **Audit logging** for all usage operations
- **Data encryption** for sensitive usage metrics
- **GDPR compliance** with data retention policies
- **API rate limiting** to prevent abuse
- **Input validation** and sanitization

## 📞 Support & Maintenance

### Monitoring
- Automated health checks and alerts
- Performance monitoring and optimization
- Error tracking and resolution
- Usage pattern analysis

### Maintenance
- Regular cleanup of old usage data
- Performance optimization and tuning
- Security updates and patches
- Feature updates and enhancements

---

**Implementation Status**: ✅ Complete  
**Test Coverage**: ✅ Comprehensive  
**Documentation**: ✅ Complete  
**Ready for Production**: ✅ Yes

The CantoneseScribe usage tracking system is now fully implemented, tested, and ready for production deployment. The system provides robust usage management, real-time monitoring, and comprehensive analytics while maintaining excellent performance and scalability characteristics.