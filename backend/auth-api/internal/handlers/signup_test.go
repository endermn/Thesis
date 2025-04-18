package handlers_test

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/endermn/Thesis/backend/auth-api/internal/handlers"
	"github.com/endermn/Thesis/backend/auth-api/internal/repository/postgres"
	testutils "github.com/endermn/Thesis/backend/auth-api/pkg/test-utils"
	"github.com/gin-gonic/gin"
)

func TestSignupHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := postgres.Config{
		User:     "postgres",
		Password: "4294",
		Addr:     "localhost:5432",
		DBName:   "test_db",
	}
	db, err := postgres.Init(config)
	if err != nil {
		t.Fatalf("Failed to init postgres database: %s", err)
	}

	test_pem := "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEINRde7gen5gEY4BpiUOa/8ng2MKctPPJTaAbee3bha2UoAoGCCqGSM49\nAwEHoUQDQgAE5tTLdebVfUZNpF/soUsHPB65UFEctl0VfE+ysXxTSiWj2BZ5ZXbr\nlJ2U0oHkkvU4C4sEArRBelU7jv2fGrLxRA==\n-----END EC PRIVATE KEY-----"

	t.Setenv("PEM_KEY", test_pem)

	db.Exec("TRUNCATE games, statistics, users, news, sessions;")

	router := gin.Default()
	router.POST("/signup", handlers.SignupHandler(db))

	jsonStr := fmt.Sprintf(`{
		"fullname":"%s",
		"email":"%s",
		"password":"%s"
	}`, "pesho", "test@gmail.com", "12345678")

	req := testutils.NewRequest(http.MethodPost, "/signup", bytes.NewBufferString(jsonStr))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Failed to login user: %v", w.Body)
	}
}
