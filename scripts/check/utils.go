package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// runCommand executes a command and optionally captures its output.
func runCommand(cmd *exec.Cmd, captureOutput bool) (string, error) {
	var stdout, stderr bytes.Buffer
	if captureOutput {
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
	} else {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}

	err := cmd.Run()
	output := stdout.String()
	if stderr.Len() > 0 {
		output += stderr.String()
	}
	return output, err
}

// commandExists checks if a command exists in PATH.
func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// findRootDir finds the project root directory.
// For monorepo structure, it looks for apps/desktop/src-tauri/Cargo.toml.
// Falls back to old structure (src-tauri/Cargo.toml at root) for backward compatibility.
func findRootDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		// Check for monorepo structure: apps/desktop/src-tauri/Cargo.toml
		monorepoCargoToml := filepath.Join(dir, "apps", "desktop", "src-tauri", "Cargo.toml")
		if _, err := os.Stat(monorepoCargoToml); err == nil {
			return dir, nil
		}

		// Fallback: old structure with src-tauri at root
		tauriCargoToml := filepath.Join(dir, "src-tauri", "Cargo.toml")
		packageJson := filepath.Join(dir, "package.json")
		if _, err := os.Stat(tauriCargoToml); err == nil {
			if _, err := os.Stat(packageJson); err == nil {
				return dir, nil
			}
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("could not find project root (looking for apps/desktop/src-tauri/Cargo.toml or src-tauri/Cargo.toml)")
		}
		dir = parent
	}
}
