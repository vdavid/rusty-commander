package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// --- Website checks ---

// WebsitePrettierCheck runs Prettier on the website.
type WebsitePrettierCheck struct{}

func (c *WebsitePrettierCheck) Name() string { return "Prettier (website)" }

func (c *WebsitePrettierCheck) Run(ctx *CheckContext) error {
	websiteDir := filepath.Join(ctx.RootDir, "apps", "website")

	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "format:check")
	} else {
		cmd = exec.Command("pnpm", "format")
	}
	cmd.Dir = websiteDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("prettier failed")
	}
	return nil
}

// WebsiteESLintCheck runs ESLint on the website.
type WebsiteESLintCheck struct{}

func (c *WebsiteESLintCheck) Name() string { return "ESLint (website)" }

func (c *WebsiteESLintCheck) Run(ctx *CheckContext) error {
	websiteDir := filepath.Join(ctx.RootDir, "apps", "website")

	// Check if eslint.config.js exists
	if _, err := os.Stat(filepath.Join(websiteDir, "eslint.config.js")); os.IsNotExist(err) {
		return nil // Skip if not configured
	}

	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "lint")
	} else {
		cmd = exec.Command("pnpm", "lint:fix")
	}
	cmd.Dir = websiteDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("eslint failed")
	}
	return nil
}

// WebsiteTypecheckCheck runs TypeScript/Astro checking on the website.
type WebsiteTypecheckCheck struct{}

func (c *WebsiteTypecheckCheck) Name() string { return "Typecheck (website)" }

func (c *WebsiteTypecheckCheck) Run(ctx *CheckContext) error {
	websiteDir := filepath.Join(ctx.RootDir, "apps", "website")

	cmd := exec.Command("pnpm", "typecheck")
	cmd.Dir = websiteDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("typecheck failed")
	}
	return nil
}

// WebsiteBuildCheck runs the build to verify it works.
type WebsiteBuildCheck struct{}

func (c *WebsiteBuildCheck) Name() string { return "Build (website)" }

func (c *WebsiteBuildCheck) Run(ctx *CheckContext) error {
	websiteDir := filepath.Join(ctx.RootDir, "apps", "website")

	cmd := exec.Command("pnpm", "build")
	cmd.Dir = websiteDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("build failed")
	}
	return nil
}

// --- License server checks ---

// LicenseServerPrettierCheck runs Prettier on the license server.
type LicenseServerPrettierCheck struct{}

func (c *LicenseServerPrettierCheck) Name() string { return "Prettier (license-server)" }

func (c *LicenseServerPrettierCheck) Run(ctx *CheckContext) error {
	serverDir := filepath.Join(ctx.RootDir, "apps", "license-server")

	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "format:check")
	} else {
		cmd = exec.Command("pnpm", "format")
	}
	cmd.Dir = serverDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("prettier failed")
	}
	return nil
}

// LicenseServerESLintCheck runs ESLint on the license server.
type LicenseServerESLintCheck struct{}

func (c *LicenseServerESLintCheck) Name() string { return "ESLint (license-server)" }

func (c *LicenseServerESLintCheck) Run(ctx *CheckContext) error {
	serverDir := filepath.Join(ctx.RootDir, "apps", "license-server")

	// Check if eslint.config.js exists
	if _, err := os.Stat(filepath.Join(serverDir, "eslint.config.js")); os.IsNotExist(err) {
		return nil // Skip if not configured
	}

	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "lint")
	} else {
		cmd = exec.Command("pnpm", "lint:fix")
	}
	cmd.Dir = serverDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("eslint failed")
	}
	return nil
}

// LicenseServerTypecheckCheck runs TypeScript checking on the license server.
type LicenseServerTypecheckCheck struct{}

func (c *LicenseServerTypecheckCheck) Name() string { return "Typecheck (license-server)" }

func (c *LicenseServerTypecheckCheck) Run(ctx *CheckContext) error {
	serverDir := filepath.Join(ctx.RootDir, "apps", "license-server")

	cmd := exec.Command("pnpm", "typecheck")
	cmd.Dir = serverDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("typecheck failed")
	}
	return nil
}

// LicenseServerTestsCheck runs tests on the license server.
type LicenseServerTestsCheck struct{}

func (c *LicenseServerTestsCheck) Name() string { return "Tests (license-server)" }

func (c *LicenseServerTestsCheck) Run(ctx *CheckContext) error {
	serverDir := filepath.Join(ctx.RootDir, "apps", "license-server")

	cmd := exec.Command("pnpm", "test")
	cmd.Dir = serverDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("tests failed")
	}
	return nil
}
