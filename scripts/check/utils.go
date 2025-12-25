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

// findRootDir finds the project root directory by looking for src-tauri/Cargo.toml and package.json.
func findRootDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		// Check if this is the project root by looking for src-tauri/Cargo.toml and package.json
		tauriCargoToml := filepath.Join(dir, "src-tauri", "Cargo.toml")
		packageJson := filepath.Join(dir, "package.json")
		if _, err := os.Stat(tauriCargoToml); err == nil {
			if _, err := os.Stat(packageJson); err == nil {
				return dir, nil
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("could not find project root (looking for src-tauri/Cargo.toml and package.json)")
		}
		dir = parent
	}
}
