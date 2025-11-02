# Supabase Migrations - GitHub Actions Setup

This repository uses GitHub Actions to automatically apply Supabase migrations when changes are pushed to the `main` branch.

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### 1. `SUPABASE_ACCESS_TOKEN`
Your Supabase access token for API authentication.

**How to get it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Account > Access Tokens
3. Generate a new access token
4. Copy and save it as `SUPABASE_ACCESS_TOKEN` in GitHub secrets

### 2. `SUPABASE_DB_PASSWORD`
Your Supabase database password.

**How to get it:**
1. Go to your project in Supabase Dashboard
2. Navigate to Settings > Database
3. Find "Database password" section
4. Use the password you set when creating the project
5. Save it as `SUPABASE_DB_PASSWORD` in GitHub secrets

### 3. `SUPABASE_PROJECT_ID`
Your Supabase project reference ID.

**How to get it:**
1. Go to your project in Supabase Dashboard
2. Navigate to Settings > General
3. Find "Reference ID" under Project Settings
4. It looks like: `tgvcjhzjdyfloppunnna`
5. Save it as `SUPABASE_PROJECT_ID` in GitHub secrets

## How It Works

1. **Trigger**: The workflow runs automatically when:
   - Changes are pushed to the `main` branch
   - Files in `supabase/migrations/` are modified

2. **Process**:
   - Checks out the code
   - Installs Supabase CLI
   - Links to your Supabase project
   - Applies pending migrations using `supabase db push`

3. **Migration Files**: All SQL migration files in `supabase/migrations/` are applied in alphabetical order (by timestamp prefix).

## Local Development

To apply migrations locally during development:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
supabase db push
```

## Manual Migration

If you need to apply migrations manually:

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the content of migration files from `supabase/migrations/`
4. Run them in order (by timestamp)

## Troubleshooting

- **Migration fails**: Check the Actions logs for detailed error messages
- **Duplicate migrations**: Ensure migration files have unique timestamps
- **Permission errors**: Verify all GitHub secrets are correctly set
- **Network issues**: Re-run the workflow from the Actions tab

## Security Notes

- Never commit secrets to the repository
- GitHub secrets are encrypted and only exposed during workflow execution
- Use separate projects/credentials for staging and production
