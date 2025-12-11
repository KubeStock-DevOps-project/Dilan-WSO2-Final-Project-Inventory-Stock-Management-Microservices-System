# How to Re-fork and Push Changes

If you need to delete your existing fork and start fresh with a new fork while keeping your local changes, follow these steps.

## Step 1: Delete the Existing Fork on GitHub

1.  Go to your **GitHub** repository page for the forked repo (e.g., `https://github.com/YOUR_USERNAME/kubestock-core`).
2.  Click on **Settings** (top tab).
3.  Scroll down to the **Danger Zone**.
4.  Click **Delete this repository**.
5.  Confirm the deletion by typing the repository name.

## Step 2: Fork the Original Repository Again

1.  Go to the **original** repository URL (the one you want to fork from).
2.  Click the **Fork** button (top right).
3.  Choose your account as the destination.
4.  Wait for the forking process to complete.

## Step 3: Update Local Git Remotes

You need to point your local `origin` to the *new* fork.

1.  Open your terminal in the project directory (`c:\Users\Gavas\Desktop\wso2-project\kubestock-core`).
2.  Check your current remotes:
    ```powershell
    git remote -v
    ```
3.  Set the new URL for `origin` (replace `YOUR_USERNAME` with your actual GitHub username):
    ```powershell
    git remote set-url origin https://github.com/YOUR_USERNAME/kubestock-core.git
    ```
4.  Verify the change:
    ```powershell
    git remote -v
    ```

## Step 4: Push Your Local Changes

Since you re-forked, the remote history might differ from your local history if the original repo has moved ahead or if you had unique commits.

1.  Push your changes to the new fork:
    ```powershell
    git push -u origin main
    ```
    *Note: If you are working on a different branch, replace `main` with your branch name.*

2.  **Force Push (If necessary):**
    If the push is rejected because of history mismatch (common when re-forking), and you want your *local* version to be the source of truth, use force push:
    ```powershell
    git push -u origin main --force
    ```
    *(Be careful: This overwrites whatever is on the remote repo with your local code.)*

## Step 5: (Optional) Create and Push to a Specific Branch

If you want to push your changes to a new branch (e.g., `test-runner`) instead of `main`:

1.  Create and switch to the new branch:
    ```powershell
    git checkout -b test-runner
    ```
2.  Push the new branch to the remote repository:
    ```powershell
    git push -u origin test-runner
    ```

## Step 6: Create a Pull Request (PR)

After pushing your changes, you need to propose them to the original repository.

1.  Go to the **GitHub page** of your *new* fork (e.g., `https://github.com/YOUR_USERNAME/kubestock-core`).
2.  You will often see a banner saying **"Compare & pull request"** if you recently pushed a new branch. Click it.
3.  If you don't see the banner:
    *   Click the **Pull requests** tab.
    *   Click **New pull request**.
    *   Click **"compare across forks"**.
    *   **Base repository:** Select the original repository (upstream) and the branch you want to merge into (usually `main` or `master`).
    *   **Head repository:** Select your fork and the branch containing your changes (e.g., `test-runner`).
4.  Add a Title and Description for your PR.
5.  Click **Create pull request**.

## Summary of Commands

```powershell
# 1. Check current remotes
git remote -v

# 2. Point origin to your NEW fork
git remote set-url origin https://github.com/YOUR_USERNAME/kubestock-core.git

# 3. Create new branch (optional)
git checkout -b test-runner

# 4. Push your code
git push -u origin test-runner
# OR if pushing to main:
git push -u origin main
```
