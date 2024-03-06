#!/bin/bash

# Auto-completion function
_git_branch_completion() {
    local cur
    cur="${COMP_WORDS[COMP_CWORD]}"
    COMPREPLY=($(compgen -W "$(git branch --list | cut -c 3-)" -- "$cur"))
}

# Register auto-completion function for branch argument
complete -F _git_branch_completion ./git_upload.sh

# Main script
# Check if commit message and branch are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <commit_message> <branch>"
    exit 1
fi

commit_message="$1"
branch="$2"

# Add all files to the staging area
git add .

# Commit changes with the provided message
git commit -m "$commit_message"

# Push changes to the remote repository
git push origin "$branch"
