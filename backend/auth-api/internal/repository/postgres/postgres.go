package postgres

import (
	"fmt"
	"log"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type Config struct {
	User     string
	Password string
	Addr     string
	DBName   string
}

func Init(config Config) error {
	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s/%s?sslmode=disable",
		config.User,
		config.Password,
		config.Addr,
		config.DBName,
	)
	var err error
	DB, err = gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database %s on address %s: %s", config.DBName, config.Addr, err)
		return err
	}

	err = DB.AutoMigrate()
	if err != nil {
		log.Printf("Auto migration failed: %v", err)
		return err
	}

	return nil
}
